import { asc, desc, eq } from "drizzle-orm";
import type { BookingDetails, Property, SelectedBookingAmenity } from "@luxestay/contracts";
import type { LuxeStayDb } from "../../db/client.js";
import {
  reservationAmenitiesTable,
  reservationsTable,
} from "../../db/schema/index.js";
import type { ApiCatalogRepository } from "../catalog/repository.js";
import type { ApiReservationRepository } from "./repository.js";

export type ReservationRow = typeof reservationsTable.$inferSelect;
export type ReservationAmenityRow = typeof reservationAmenitiesTable.$inferSelect;

export function mapReservationRowsToBookingDetails(
  row: ReservationRow,
  property: Property,
  amenityRows: readonly ReservationAmenityRow[]
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
    createdAt: row.createdAt.toISOString(),
    status: row.status,
    cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : undefined,
    cancellationReason: row.cancellationReason ?? undefined,
  });
}

export function createPostgresReservationRepository(deps: {
  db: LuxeStayDb;
  catalogRepository: ApiCatalogRepository;
}): ApiReservationRepository {
  const { db, catalogRepository } = deps;

  return {
    async save(booking: BookingDetails): Promise<BookingDetails> {
      const bookingId = booking.bookingId?.trim();
      if (!bookingId) {
        throw new Error("Cannot persist reservation without bookingId.");
      }

      await db.transaction(async (tx) => {
        await tx.insert(reservationsTable).values({
          bookingId,
          propertyId: booking.property.id,
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
          total: booking.pricing.total,
          guestFullName: booking.guestInfo.fullName,
          guestEmail: booking.guestInfo.email,
          guestPhone: booking.guestInfo.phone,
          guestNote: booking.guestInfo.note ?? null,
          paymentMethod: booking.paymentMethod,
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

      const [property, amenityRows] = await Promise.all([
        catalogRepository.getPropertyById(row.propertyId),
        db
          .select()
          .from(reservationAmenitiesTable)
          .where(eq(reservationAmenitiesTable.bookingId, normalized))
          .orderBy(asc(reservationAmenitiesTable.sortOrder)),
      ]);

      if (!property) return null;
      return mapReservationRowsToBookingDetails(row, property, amenityRows);
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
      const [rows, amenityRows, snapshot] = await Promise.all([
        db.select().from(reservationsTable).orderBy(desc(reservationsTable.createdAt)),
        db
          .select()
          .from(reservationAmenitiesTable)
          .orderBy(asc(reservationAmenitiesTable.sortOrder)),
        catalogRepository.getSnapshot(),
      ]);

      const propertyById = new Map(snapshot.properties.map((p) => [p.id, p]));
      const amenitiesByBooking = new Map<string, ReservationAmenityRow[]>();
      for (const item of amenityRows) {
        const list = amenitiesByBooking.get(item.bookingId);
        if (list) list.push(item);
        else amenitiesByBooking.set(item.bookingId, [item]);
      }

      const result: BookingDetails[] = [];
      for (const row of rows) {
        const property = propertyById.get(row.propertyId);
        if (!property) continue;
        result.push(
          mapReservationRowsToBookingDetails(
            row,
            property,
            amenitiesByBooking.get(row.bookingId) ?? []
          )
        );
      }
      return Object.freeze(result);
    },
  };
}
