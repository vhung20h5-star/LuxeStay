import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { ActivityBooking, TravelActivity } from "@luxestay/contracts";
import type { LuxeStayDb } from "../../db/client.js";
import {
  activityBookingsTable,
  reservationActivitiesTable,
  travelActivitiesTable,
} from "../../db/schema/index.js";
import type { ApiActivitiesRepository } from "./repository.js";

export type TravelActivityRow = typeof travelActivitiesTable.$inferSelect;
export type ActivityBookingRow = typeof activityBookingsTable.$inferSelect;

export function mapActivityRowToDomain(row: TravelActivityRow): TravelActivity {
  return Object.freeze({
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    category: row.category,
    destinationCity: row.destinationCity,
    province: row.province,
    meetingPoint: row.meetingPoint,
    durationLabel: row.durationLabel,
    pricePerUnit: row.pricePerUnit,
    unitLabel: row.unitLabel,
    ...(row.originalPrice !== null ? { originalPrice: row.originalPrice } : {}),
    rating: row.rating,
    reviewCount: row.reviewCount,
    images: Object.freeze([...row.images]) as string[],
    highlights: Object.freeze([...row.highlights]) as string[],
    included: Object.freeze([...row.included]) as string[],
    freeCancellation: row.freeCancellation,
    instantConfirmation: row.instantConfirmation,
    slots: Object.freeze(row.slots.map((s) => Object.freeze({ ...s }))) as TravelActivity["slots"],
    ...(row.transferDetails ? { transferDetails: Object.freeze({ ...row.transferDetails }) } : {}),
    isFeatured: row.isFeatured,
    isActive: row.isActive,
  });
}

export function mapActivityBookingRowToDomain(row: ActivityBookingRow): ActivityBooking {
  return Object.freeze({
    bookingId: row.bookingId,
    activityId: row.activityId,
    activitySlug: row.activitySlug,
    activityTitle: row.activityTitle,
    activityCategory: row.activityCategory,
    activityImage: row.activityImage,
    destinationCity: row.destinationCity,
    slotId: row.slotId,
    slotLabel: row.slotLabel,
    dateIso: row.dateIso,
    quantity: row.quantity,
    unitLabel: row.unitLabel,
    unitPrice: row.unitPrice,
    subtotal: row.subtotal,
    discount: row.discount,
    ...(row.appliedPromoCode ? { appliedPromoCode: row.appliedPromoCode } : {}),
    total: row.total,
    guestInfo: Object.freeze({
      fullName: row.guestFullName,
      email: row.guestEmail,
      phone: row.guestPhone,
      ...(row.guestNote ? { note: row.guestNote } : {}),
    }),
    paymentMethod: row.paymentMethod,
    ...(row.userId ? { userId: row.userId } : {}),
    ...(row.linkedReservationId ? { linkedReservationId: row.linkedReservationId } : {}),
    freeCancellation: row.freeCancellation,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    ...(row.cancelledAt ? { cancelledAt: row.cancelledAt.toISOString() } : {}),
    ...(row.cancellationReason ? { cancellationReason: row.cancellationReason } : {}),
  });
}

async function querySlotBookedQuantity(
  executor: Pick<LuxeStayDb, "select">,
  activityId: string,
  slotId: string,
  dateIso: string
): Promise<number> {
  const [standaloneRow] = await executor
    .select({
      qty: sql<number>`coalesce(sum(${activityBookingsTable.quantity}), 0)::int`,
    })
    .from(activityBookingsTable)
    .where(
      and(
        eq(activityBookingsTable.activityId, activityId),
        eq(activityBookingsTable.slotId, slotId),
        eq(activityBookingsTable.dateIso, dateIso),
        eq(activityBookingsTable.status, "confirmed")
      )
    );

  const [bundleRow] = await executor
    .select({
      qty: sql<number>`coalesce(sum(${reservationActivitiesTable.quantity}), 0)::int`,
    })
    .from(reservationActivitiesTable)
    .where(
      and(
        eq(reservationActivitiesTable.activityId, activityId),
        eq(reservationActivitiesTable.slotId, slotId),
        eq(reservationActivitiesTable.dateIso, dateIso),
        eq(reservationActivitiesTable.status, "confirmed")
      )
    );

  return Number(standaloneRow?.qty ?? 0) + Number(bundleRow?.qty ?? 0);
}

export function createPostgresActivitiesRepository(db: LuxeStayDb): ApiActivitiesRepository {
  return {
    async listActivities() {
      const rows = await db
        .select()
        .from(travelActivitiesTable)
        .orderBy(asc(travelActivitiesTable.sortOrder), asc(travelActivitiesTable.id));
      return Object.freeze(rows.map(mapActivityRowToDomain));
    },

    async findActivityById(id: string) {
      const [row] = await db
        .select()
        .from(travelActivitiesTable)
        .where(eq(travelActivitiesTable.id, id.trim()))
        .limit(1);
      return row ? mapActivityRowToDomain(row) : null;
    },

    async findActivityBySlug(slug: string) {
      const [row] = await db
        .select()
        .from(travelActivitiesTable)
        .where(eq(travelActivitiesTable.slug, slug.trim().toLowerCase()))
        .limit(1);
      return row ? mapActivityRowToDomain(row) : null;
    },

    async getBookedQuantityForSlot(activityId, slotId, dateIso) {
      return querySlotBookedQuantity(db, activityId.trim(), slotId.trim(), dateIso.trim());
    },

    async getBookedCountsForSlots(keys) {
      const result = new Map<string, number>();
      for (const k of keys) {
        const aId = k.activityId.trim();
        const sId = k.slotId.trim();
        const dIso = k.dateIso.trim();
        const mapKey = `${aId}::${sId}::${dIso}`;
        if (!result.has(mapKey)) {
          result.set(mapKey, await querySlotBookedQuantity(db, aId, sId, dIso));
        }
      }
      return result;
    },

    async createBookingWithSlotLock({ activityId, slotId, dateIso }, prepare) {
      const normActivityId = activityId.trim();
      const normSlotId = slotId.trim();
      const normDateIso = dateIso.trim();

      return db.transaction(async (tx) => {
        await tx
          .select({ id: travelActivitiesTable.id })
          .from(travelActivitiesTable)
          .where(eq(travelActivitiesTable.id, normActivityId))
          .for("update");

        const bookedQuantityForSlot = await querySlotBookedQuantity(
          tx,
          normActivityId,
          normSlotId,
          normDateIso
        );

        const prepared = prepare({ bookedQuantityForSlot });
        if (!prepared.ok) {
          return prepared;
        }

        const booking = prepared.booking;
        await tx.insert(activityBookingsTable).values({
          bookingId: booking.bookingId,
          activityId: booking.activityId,
          userId: booking.userId ?? null,
          linkedReservationId: booking.linkedReservationId ?? null,
          activitySlug: booking.activitySlug,
          activityTitle: booking.activityTitle,
          activityCategory: booking.activityCategory,
          activityImage: booking.activityImage,
          destinationCity: booking.destinationCity,
          slotId: booking.slotId,
          slotLabel: booking.slotLabel,
          dateIso: booking.dateIso,
          quantity: booking.quantity,
          unitLabel: booking.unitLabel,
          unitPrice: booking.unitPrice,
          subtotal: booking.subtotal,
          discount: booking.discount,
          appliedPromoCode: booking.appliedPromoCode ?? null,
          total: booking.total,
          guestFullName: booking.guestInfo.fullName,
          guestEmail: booking.guestInfo.email,
          guestPhone: booking.guestInfo.phone,
          guestNote: booking.guestInfo.note ?? null,
          paymentMethod: booking.paymentMethod,
          freeCancellation: booking.freeCancellation,
          status: booking.status,
          createdAt: new Date(booking.createdAt),
          cancelledAt: booking.cancelledAt ? new Date(booking.cancelledAt) : null,
          cancellationReason: booking.cancellationReason ?? null,
        });

        return prepared;
      });
    },

    async findBookingById(bookingId: string) {
      const [row] = await db
        .select()
        .from(activityBookingsTable)
        .where(eq(activityBookingsTable.bookingId, bookingId.trim().toUpperCase()))
        .limit(1);
      return row ? mapActivityBookingRowToDomain(row) : null;
    },

    async findBookingsByUserId(userId: string) {
      const rows = await db
        .select()
        .from(activityBookingsTable)
        .where(eq(activityBookingsTable.userId, userId.trim()))
        .orderBy(desc(activityBookingsTable.createdAt));
      return Object.freeze(rows.map(mapActivityBookingRowToDomain));
    },

    async updateBooking(booking: ActivityBooking) {
      await db
        .update(activityBookingsTable)
        .set({
          status: booking.status,
          cancelledAt: booking.cancelledAt ? new Date(booking.cancelledAt) : null,
          cancellationReason: booking.cancellationReason ?? null,
        })
        .where(eq(activityBookingsTable.bookingId, booking.bookingId.trim().toUpperCase()));
      return booking;
    },
  };
}
