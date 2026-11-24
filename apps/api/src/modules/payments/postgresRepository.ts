import { desc, eq } from "drizzle-orm";
import type { PaymentTransaction } from "@luxestay/contracts";
import type { LuxeStayDb } from "../../db/client.js";
import {
  paymentTransactionsTable,
  paymentWebhookEventsTable,
} from "../../db/schema/index.js";
import { mapPaymentRowToDomain } from "../reservations/postgresRepository.js";
import type { ApiPaymentRepository, StoredWebhookEvent } from "./repository.js";

export function createPostgresPaymentRepository(db: LuxeStayDb): ApiPaymentRepository {
  return {
    async createTransaction(tx: PaymentTransaction) {
      const normalizedId = tx.transactionId.trim().toUpperCase();
      await db.insert(paymentTransactionsTable).values({
        transactionId: normalizedId,
        bookingId: tx.bookingId.trim().toUpperCase(),
        provider: tx.provider,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        checkoutUrl: tx.checkoutUrl,
        expiresAt: new Date(tx.expiresAt),
        createdAt: new Date(tx.createdAt),
        updatedAt: new Date(tx.updatedAt),
        paidAt: tx.paidAt ? new Date(tx.paidAt) : null,
        failureReason: tx.failureReason ?? null,
      });
      return Object.freeze({ ...tx, transactionId: normalizedId });
    },

    async findByTransactionId(transactionId: string) {
      const rows = await db
        .select()
        .from(paymentTransactionsTable)
        .where(eq(paymentTransactionsTable.transactionId, transactionId.trim().toUpperCase()))
        .limit(1);
      return rows[0] ? mapPaymentRowToDomain(rows[0]) : null;
    },

    async findLatestByBookingId(bookingId: string) {
      const rows = await db
        .select()
        .from(paymentTransactionsTable)
        .where(eq(paymentTransactionsTable.bookingId, bookingId.trim().toUpperCase()))
        .orderBy(desc(paymentTransactionsTable.createdAt))
        .limit(1);
      return rows[0] ? mapPaymentRowToDomain(rows[0]) : null;
    },

    async updateTransaction(tx: PaymentTransaction) {
      const normalizedId = tx.transactionId.trim().toUpperCase();
      await db
        .update(paymentTransactionsTable)
        .set({
          status: tx.status,
          updatedAt: new Date(tx.updatedAt),
          paidAt: tx.paidAt ? new Date(tx.paidAt) : null,
          failureReason: tx.failureReason ?? null,
        })
        .where(eq(paymentTransactionsTable.transactionId, normalizedId));
      return Object.freeze({ ...tx, transactionId: normalizedId });
    },

    async hasWebhookEvent(eventId: string) {
      const rows = await db
        .select({ eventId: paymentWebhookEventsTable.eventId })
        .from(paymentWebhookEventsTable)
        .where(eq(paymentWebhookEventsTable.eventId, eventId.trim()))
        .limit(1);
      return rows.length > 0;
    },

    async recordWebhookEvent(event: StoredWebhookEvent) {
      const inserted = await db
        .insert(paymentWebhookEventsTable)
        .values({
          eventId: event.eventId.trim(),
          provider: event.provider,
          transactionId: event.transactionId.trim().toUpperCase(),
          bookingId: event.bookingId.trim().toUpperCase(),
          outcome: event.outcome,
          processedAt: new Date(event.processedAt),
        })
        .onConflictDoNothing()
        .returning({ eventId: paymentWebhookEventsTable.eventId });
      return inserted.length > 0;
    },
  };
}
