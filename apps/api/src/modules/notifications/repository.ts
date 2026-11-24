import type { NotificationLog } from "@luxestay/contracts";

export interface ApiNotificationRepository {
  save(log: NotificationLog): Promise<NotificationLog>;
  listByBookingId(bookingId: string): Promise<readonly NotificationLog[]>;
}

export function createInMemoryNotificationRepository(): ApiNotificationRepository {
  const logs: NotificationLog[] = [];

  return {
    async save(log) {
      const frozen = Object.freeze({ ...log });
      logs.push(frozen);
      return frozen;
    },

    async listByBookingId(bookingId) {
      const target = bookingId.trim().toUpperCase();
      const matching = logs
        .filter((l) => l.bookingId.trim().toUpperCase() === target)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return Object.freeze(matching);
    },
  };
}
