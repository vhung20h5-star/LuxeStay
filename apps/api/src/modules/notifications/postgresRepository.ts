import { desc, eq } from "drizzle-orm";
import type { NotificationLog } from "@luxestay/contracts";
import type { LuxeStayDb } from "../../db/client.js";
import { notificationLogsTable } from "../../db/schema/index.js";
import type { ApiNotificationRepository } from "./repository.js";

function mapRow(row: typeof notificationLogsTable.$inferSelect): NotificationLog {
  return Object.freeze({
    id: row.id,
    bookingId: row.bookingId,
    recipientEmail: row.recipientEmail,
    channel: row.channel,
    type: row.type,
    subject: row.subject,
    previewText: row.previewText,
    htmlBody: row.htmlBody,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  });
}

export function createPostgresNotificationRepository(
  db: LuxeStayDb
): ApiNotificationRepository {
  return {
    async save(log: NotificationLog) {
      await db.insert(notificationLogsTable).values({
        id: log.id,
        bookingId: log.bookingId.trim().toUpperCase(),
        recipientEmail: log.recipientEmail,
        channel: log.channel,
        type: log.type,
        subject: log.subject,
        previewText: log.previewText,
        htmlBody: log.htmlBody,
        status: log.status,
        createdAt: new Date(log.createdAt),
      });
      return Object.freeze({ ...log });
    },

    async listByBookingId(bookingId: string) {
      const rows = await db
        .select()
        .from(notificationLogsTable)
        .where(eq(notificationLogsTable.bookingId, bookingId.trim().toUpperCase()))
        .orderBy(desc(notificationLogsTable.createdAt));
      return Object.freeze(rows.map(mapRow));
    },
  };
}
