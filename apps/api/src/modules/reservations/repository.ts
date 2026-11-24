import type { BookingDetails } from "@luxestay/contracts";

export interface ApiReservationRepository {
  save(booking: BookingDetails): Promise<BookingDetails>;
  findById(bookingId: string): Promise<BookingDetails | null>;
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
