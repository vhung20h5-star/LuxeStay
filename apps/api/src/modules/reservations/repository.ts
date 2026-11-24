import type {
  BookingDetails,
  ErrorCode,
  PropertyAvailabilityOverride,
} from "@luxestay/contracts";
import { hasPriorSuccessfulBookings, type ReservationOccupancyLike } from "@luxestay/domain";
import type { ApiAvailabilityRepository } from "../availability/repository.js";

export type LockedReservationPreparation =
  | { ok: true; booking: BookingDetails }
  | { ok: false; status: 400 | 404 | 409 | 422; code: ErrorCode; message: string };

export interface ApiReservationRepository {
  save(booking: BookingDetails): Promise<BookingDetails>;
  findById(bookingId: string): Promise<BookingDetails | null>;
  findByUserId(userId: string): Promise<readonly BookingDetails[]>;
  hasSuccessfulBookingByUserId(userId: string): Promise<boolean>;
  findActiveByPropertyId(propertyId: string): Promise<readonly ReservationOccupancyLike[]>;
  createWithPropertyLock(
    propertyId: string,
    prepare: (context: {
      existingReservations: readonly ReservationOccupancyLike[];
      dailyOverrides: readonly PropertyAvailabilityOverride[];
      hasPriorSuccessfulBookings: boolean;
    }) => LockedReservationPreparation,
    lockOptions?: { userId?: string }
  ): Promise<LockedReservationPreparation>;
  update(booking: BookingDetails): Promise<BookingDetails>;
  listAll(): Promise<readonly BookingDetails[]>;
}

function hasSuccessfulUserBookingInStore(
  store: ReadonlyMap<string, BookingDetails>,
  userId: string | undefined
): boolean {
  const normalized = userId?.trim();
  if (!normalized) return false;
  const userBookings: BookingDetails[] = [];
  for (const booking of store.values()) {
    if (booking.userId === normalized) {
      userBookings.push(booking);
    }
  }
  return hasPriorSuccessfulBookings(userBookings);
}

export function createInMemoryReservationRepository(deps?: {
  availabilityRepository?: ApiAvailabilityRepository;
}): ApiReservationRepository {
  const store = new Map<string, BookingDetails>();
  const propertyLocks = new Map<string, Promise<void>>();

  async function withPropertyMutex<T>(propertyId: string, fn: () => Promise<T>): Promise<T> {
    const key = propertyId.trim();
    const prev = propertyLocks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const chained = prev.then(() => next);
    propertyLocks.set(key, chained);

    await prev;
    try {
      return await fn();
    } finally {
      release();
      if (propertyLocks.get(key) === chained) {
        propertyLocks.delete(key);
      }
    }
  }

  return {
    async save(booking: BookingDetails) {
      if (booking.bookingId) {
        store.set(booking.bookingId.trim().toUpperCase(), booking);
      }
      return booking;
    },
    async findById(bookingId: string) {
      return store.get(bookingId.trim().toUpperCase()) ?? null;
    },
    async findByUserId(userId: string) {
      const normalized = userId.trim();
      const matching = [...store.values()]
        .filter((b) => b.userId === normalized)
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
      return Object.freeze(matching);
    },
    async hasSuccessfulBookingByUserId(userId: string) {
      return hasSuccessfulUserBookingInStore(store, userId);
    },
    async findActiveByPropertyId(propertyId: string) {
      const normalized = propertyId.trim();
      const matching = [...store.values()].filter(
        (b) =>
          b.property.id === normalized &&
          (b.status === "confirmed" || b.status === "pending_payment")
      );
      return Object.freeze(matching);
    },
    async createWithPropertyLock(propertyId, prepare, lockOptions) {
      return withPropertyMutex(propertyId, async () => {
        const normalized = propertyId.trim();
        const existingReservations = [...store.values()].filter(
          (b) =>
            b.property.id === normalized &&
            (b.status === "confirmed" || b.status === "pending_payment")
        );
        const dailyOverrides = deps?.availabilityRepository
          ? await deps.availabilityRepository.listOverrides(normalized)
          : Object.freeze([]);
        const hasPriorSuccessful = lockOptions?.userId
          ? hasSuccessfulUserBookingInStore(store, lockOptions.userId)
          : false;

        const prepared = prepare({
          existingReservations,
          dailyOverrides,
          hasPriorSuccessfulBookings: hasPriorSuccessful,
        });
        if (!prepared.ok) {
          return prepared;
        }
        if (prepared.booking.bookingId) {
          store.set(prepared.booking.bookingId.trim().toUpperCase(), prepared.booking);
        }
        return prepared;
      });
    },
    async update(booking: BookingDetails) {
      if (booking.bookingId) {
        store.set(booking.bookingId.trim().toUpperCase(), booking);
      }
      return booking;
    },
    async listAll() {
      return Object.freeze([...store.values()]);
    },
  };
}
