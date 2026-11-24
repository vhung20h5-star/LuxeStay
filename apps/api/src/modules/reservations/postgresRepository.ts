import { asc, desc, eq, inArray } from "drizzle-orm";
import type {
  BookingDetails,
  PaymentTransaction,
  Property,
  SelectedBookingAmenity,
} from "@luxestay/contracts";
import type { LuxeStayDb } from "../../db/client.js";
import {
  paymentTransactionsTable,
  reservationAmenitiesTable,
  reservationsTable,
} from "../../db/schema/index.js";
import type { ApiCatalogRepository } from "../catalog/repository.js";
import type { ApiReservationRepository } from "./repository.js";

export type ReservationRow = typeof reservationsTable.$inferSelect;
export type ReservationAmenityRow = typeof reservationAmenitiesTable.$inferSelect;
export type PaymentTransactionRow = typeof paymentTransactionsTable.$inferSelect;

export function mapPaymentRowToDomain(row: PaymentTransactionRow): PaymentTransaction {
  return Object.freeze({
    transactionId: row.transactionId,
    bookingId: row.bookingId,
    provider: row.provider,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    checkoutUrl: row.checkoutUrl,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(row.paidAt ? { paidAt: row.paidAt.toISOString() } : {}),
    ...(row.failureReason ? { failureReason: row.failureReason } : {}),
  });
}

export function mapReservationRowsToBookingDetails(
  row: ReservationRow,
  property: Property,
  amenityRows: readonly ReservationAmenityRow[],
  paymentRow?: PaymentTransactionRow
): BookingDetails {
  const selectedAmenities: readonly SelectedBookingAmenity[] = Object.freeze(
    amenityRows.map((item) =>
      Object.freeze({
        id: item.amenityId,
        name: item.name,
        category: item.category,
        pricingType: item.pricingType,
        price: item.price,
        priceUnit: item.priceUnit ?? undefined,
      })
    )
  );

  return Object.freeze({
    property,
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    nights: row.nights,
    guests: Object.freeze({
      adults: row.adults,
      children: row.children,
      rooms: row.rooms,
    }),
    pricing: Object.freeze({
      basePrice: row.basePrice,
      nightsTotal: row.nightsTotal,
      cleaningFee: row.cleaningFee,
      serviceFee: row.serviceFee,
      amenitiesFee: row.amenitiesFee,
      discount: row.discount,
      ...(row.appliedPromoCode ? { appliedPromoCode: row.appliedPromoCode } : {}),
      total: row.total,
    }),
    selectedAmenities,
    guestInfo: Object.freeze({
      fullName: row.guestFullName,
      email: row.guestEmail,
      phone: row.guestPhone,
      note: row.guestNote ?? undefined,
    }),
    paymentMethod: row.paymentMethod,
    bookingId: row.bookingId,
    ...(row.userId ? { userId: row.userId } : {}),
    createdAt: row.createdAt.toISOString(),
    status: row.status,
    ...(row.paymentExpiresAt ? { paymentExpiresAt: row.paymentExpiresAt.toISOString() } : {}),
    ...(paymentRow ? { payment: mapPaymentRowToDomain(paymentRow) } : {}),
    cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : undefined,
    cancellationReason: row.cancellationReason ?? undefined,
  });
}

export function createPostgresReservationRepository(deps: {
  db: LuxeStayDb;
  catalogRepository: ApiCatalogRepository;
}): ApiReservationRepository {
  const { db, catalogRepository } = deps;

  async function hydrateRows(rows: readonly ReservationRow[]): Promise<readonly BookingDetails[]> {
    if (rows.length === 0) return Object.freeze([]);
    const bookingIds = rows.map((r) => r.bookingId);
    const [amenityRows, paymentRows, snapshot] = await Promise.all([
      db
        .select()
        .from(reservationAmenitiesTable)
        .where(inArray(reservationAmenitiesTable.bookingId, bookingIds))
        .orderBy(asc(reservationAmenitiesTable.sortOrder)),
      db
        .select()
        .from(paymentTransactionsTable)
        .where(inArray(paymentTransactionsTable.bookingId, bookingIds))
        .orderBy(desc(paymentTransactionsTable.createdAt)),
      catalogRepository.getSnapshot(),
    ]);

    const propertyMap = new Map(snapshot.properties.map((p) => [p.id, p]));
    const amenitiesByBooking = new Map<string, ReservationAmenityRow[]>();
    for (const row of amenityRows) {
      const list = amenitiesByBooking.get(row.bookingId);
      if (list) list.push(row);
      else amenitiesByBooking.set(row.bookingId, [row]);
    }
    const latestPaymentByBooking = new Map<string, PaymentTransactionRow>();
    for (const pay of paymentRows) {
      if (!latestPaymentByBooking.has(pay.bookingId)) {
        latestPaymentByBooking.set(pay.bookingId, pay);
      }
    }

    const bookings: BookingDetails[] = [];
    for (const row of rows) {
      const property = propertyMap.get(row.propertyId);
      if (!property) continue;
      bookings.push(
        mapReservationRowsToBookingDetails(
          row,
          property,
          amenitiesByBooking.get(row.bookingId) ?? [],
          latestPaymentByBooking.get(row.bookingId)
        )
      );
    }
    return Object.freeze(bookings);
  }

  return {
    async save(booking: BookingDetails): Promise<BookingDetails> {
      const bookingId = booking.bookingId?.trim().toUpperCase();
      if (!bookingId) {
        throw new Error("Cannot persist reservation without bookingId.");
      }

      await db.transaction(async (tx) => {
        await tx.insert(reservationsTable).values({
          bookingId,
          propertyId: booking.property.id,
          userId: booking.userId ?? null,
          status: booking.status ?? "confirmed",
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          nights: booking.nights,
          adults: booking.guests.adults,
          children: booking.guests.children,
          rooms: booking.guests.rooms,
          basePrice: booking.pricing.basePrice,
          nightsTotal: booking.pricing.nightsTotal,
          cleaningFee: booking.pricing.cleaningFee,
          serviceFee: booking.pricing.serviceFee,
          amenitiesFee: booking.pricing.amenitiesFee,
          discount: booking.pricing.discount,
          appliedPromoCode: booking.pricing.appliedPromoCode ?? null,
          total: booking.pricing.total,
          guestFullName: booking.guestInfo.fullName,
          guestEmail: booking.guestInfo.email,
          guestPhone: booking.guestInfo.phone,
          guestNote: booking.guestInfo.note ?? null,
          paymentMethod: booking.paymentMethod,
          paymentExpiresAt: booking.paymentExpiresAt ? new Date(booking.paymentExpiresAt) : null,
          createdAt: booking.createdAt ? new Date(booking.createdAt) : new Date(),
          cancelledAt: booking.cancelledAt ? new Date(booking.cancelledAt) : null,
          cancellationReason: booking.cancellationReason ?? null,
        });

        if (booking.selectedAmenities.length > 0) {
          await tx.insert(reservationAmenitiesTable).values(
            booking.selectedAmenities.map((item, idx) => ({
              bookingId,
              amenityId: item.id,
              sortOrder: idx,
              name: item.name,
              category: item.category,
              pricingType: item.pricingType,
              price: item.price,
              priceUnit: item.priceUnit ?? null,
            }))
          );
        }
      });

      return booking;
    },

    async findById(bookingId: string): Promise<BookingDetails | null> {
      const normalized = bookingId.trim().toUpperCase();
      if (!normalized) return null;

      const rows = await db
        .select()
        .from(reservationsTable)
        .where(eq(reservationsTable.bookingId, normalized))
        .limit(1);

      const row = rows[0];
      if (!row) return null;

      const [property, amenityRows, paymentRows] = await Promise.all([
        catalogRepository.getPropertyById(row.propertyId),
        db
          .select()
          .from(reservationAmenitiesTable)
          .where(eq(reservationAmenitiesTable.bookingId, normalized))
          .orderBy(asc(reservationAmenitiesTable.sortOrder)),
        db
          .select()
          .from(paymentTransactionsTable)
          .where(eq(paymentTransactionsTable.bookingId, normalized))
          .orderBy(desc(paymentTransactionsTable.createdAt))
          .limit(1),
      ]);

      if (!property) return null;
      return mapReservationRowsToBookingDetails(row, property, amenityRows, paymentRows[0]);
    },

    async findByUserId(userId: string): Promise<readonly BookingDetails[]> {
      const normalized = userId.trim();
      if (!normalized) return Object.freeze([]);

      const rows = await db
        .select()
        .from(reservationsTable)
        .where(eq(reservationsTable.userId, normalized))
        .orderBy(desc(reservationsTable.createdAt));

      return hydrateRows(rows);
    },

    async update(booking: BookingDetails): Promise<BookingDetails> {
      const bookingId = booking.bookingId?.trim().toUpperCase();
      if (!bookingId) {
        throw new Error("Cannot update reservation without bookingId.");
      }

      await db
        .update(reservationsTable)
        .set({
          status: booking.status ?? "confirmed",
          cancelledAt: booking.cancelledAt ? new Date(booking.cancelledAt) : null,
          cancellationReason: booking.cancellationReason ?? null,
        })
        .where(eq(reservationsTable.bookingId, bookingId));

      return booking;
    },

    async listAll(): Promise<readonly BookingDetails[]> {
      const rows = await db
        .select()
        .from(reservationsTable)
        .orderBy(desc(reservationsTable.createdAt));
      return hydrateRows(rows);
    },
  };
}
