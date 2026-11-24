import type { BookingDetails } from "@luxestay/contracts";

export interface ApiReservationRepository {
  save(booking: BookingDetails): Promise<BookingDetails>;
  findById(bookingId: string): Promise<BookingDetails | null>;
  findByUserId(userId: string): Promise<readonly BookingDetails[]>;
  update(booking: BookingDetails): Promise<BookingDetails>;
  listAll(): Promise<readonly BookingDetails[]>;
}

export function createInMemoryReservationRepository(): ApiReservationRepository {
  const store = new Map<string, BookingDetails>();

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
