import type {
  ActivityBooking,
  ErrorCode,
  TravelActivity,
} from "@luxestay/contracts";
import { TRAVEL_ACTIVITIES } from "@luxestay/domain/seed";

export type LockedActivityBookingPreparation =
  | { ok: true; booking: ActivityBooking }
  | { ok: false; status: 400 | 404 | 409 | 422; code: ErrorCode; message: string };

export interface ApiActivitiesRepository {
  listActivities(): Promise<readonly TravelActivity[]>;
  findActivityById(id: string): Promise<TravelActivity | null>;
  findActivityBySlug(slug: string): Promise<TravelActivity | null>;
  getBookedQuantityForSlot(activityId: string, slotId: string, dateIso: string): Promise<number>;
  getBookedCountsForSlots(
    keys: readonly { activityId: string; slotId: string; dateIso: string }[]
  ): Promise<ReadonlyMap<string, number>>;
  createBookingWithSlotLock(
    params: { activityId: string; slotId: string; dateIso: string },
    prepare: (context: { bookedQuantityForSlot: number }) => LockedActivityBookingPreparation
  ): Promise<LockedActivityBookingPreparation>;
  findBookingById(bookingId: string): Promise<ActivityBooking | null>;
  findBookingsByUserId(userId: string): Promise<readonly ActivityBooking[]>;
  updateBooking(booking: ActivityBooking): Promise<ActivityBooking>;
}

export function createInMemoryActivitiesRepository(
  seedActivities: readonly TravelActivity[] = TRAVEL_ACTIVITIES
): ApiActivitiesRepository {
  const activities: TravelActivity[] = seedActivities.map((item) =>
    Object.freeze({
      ...item,
      images: Object.freeze([...item.images]) as string[],
      highlights: Object.freeze([...item.highlights]) as string[],
      included: Object.freeze([...item.included]) as string[],
      slots: Object.freeze(item.slots.map((s) => Object.freeze({ ...s }))) as TravelActivity["slots"],
      ...(item.transferDetails ? { transferDetails: Object.freeze({ ...item.transferDetails }) } : {}),
      ...(item.attractionDetails
        ? { attractionDetails: Object.freeze({ ...item.attractionDetails }) }
        : {}),
      ...(item.essentialDetails
        ? { essentialDetails: Object.freeze({ ...item.essentialDetails }) }
        : {}),
    })
  );
  const bookings = new Map<string, ActivityBooking>();
  const slotLocks = new Map<string, Promise<void>>();

  async function withSlotMutex<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = slotLocks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const chained = prev.then(() => next);
    slotLocks.set(key, chained);

    await prev;
    try {
      return await fn();
    } finally {
      release();
      if (slotLocks.get(key) === chained) {
        slotLocks.delete(key);
      }
    }
  }

  function countConfirmedForSlot(activityId: string, slotId: string, dateIso: string): number {
    let total = 0;
    for (const booking of bookings.values()) {
      if (
        booking.status === "confirmed" &&
        booking.activityId === activityId &&
        booking.slotId === slotId &&
        booking.dateIso === dateIso
      ) {
        total += booking.quantity;
      }
    }
    return total;
  }

  return {
    async listActivities() {
      return Object.freeze([...activities]);
    },
    async findActivityById(id: string) {
      const normalized = id.trim();
      return activities.find((item) => item.id === normalized) ?? null;
    },
    async findActivityBySlug(slug: string) {
      const normalized = slug.trim().toLowerCase();
      return activities.find((item) => item.slug.toLowerCase() === normalized) ?? null;
    },
    async getBookedQuantityForSlot(activityId, slotId, dateIso) {
      return countConfirmedForSlot(activityId.trim(), slotId.trim(), dateIso.trim());
    },
    async getBookedCountsForSlots(keys) {
      const result = new Map<string, number>();
      for (const k of keys) {
        const mapKey = `${k.activityId.trim()}::${k.slotId.trim()}::${k.dateIso.trim()}`;
        if (!result.has(mapKey)) {
          result.set(mapKey, countConfirmedForSlot(k.activityId.trim(), k.slotId.trim(), k.dateIso.trim()));
        }
      }
      return result;
    },
    async createBookingWithSlotLock({ activityId, slotId, dateIso }, prepare) {
      const key = `${activityId.trim()}::${slotId.trim()}::${dateIso.trim()}`;
      return withSlotMutex(key, async () => {
        const bookedQuantityForSlot = countConfirmedForSlot(
          activityId.trim(),
          slotId.trim(),
          dateIso.trim()
        );
        const prepared = prepare({ bookedQuantityForSlot });
        if (!prepared.ok) {
          return prepared;
        }
        bookings.set(prepared.booking.bookingId.trim().toUpperCase(), prepared.booking);
        return prepared;
      });
    },
    async findBookingById(bookingId: string) {
      return bookings.get(bookingId.trim().toUpperCase()) ?? null;
    },
    async findBookingsByUserId(userId: string) {
      const normalized = userId.trim();
      const matched = [...bookings.values()]
        .filter((b) => b.userId === normalized)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return Object.freeze(matched);
    },
    async updateBooking(booking: ActivityBooking) {
      bookings.set(booking.bookingId.trim().toUpperCase(), booking);
      return booking;
    },
  };
}
