import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type {
  NotificationType,
  PaymentOutcome,
  PaymentProvider,
  PaymentTransactionStatus,
} from "@luxestay/contracts";
import { reservationsTable } from "./reservations.js";

export const paymentTransactionsTable = pgTable(
  "payment_transactions",
  {
    transactionId: text("transaction_id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => reservationsTable.bookingId, { onDelete: "cascade" }),
    provider: text("provider").$type<PaymentProvider>().notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").$type<"VND">().notNull().default("VND"),
    status: text("status")
      .$type<PaymentTransactionStatus>()
      .notNull()
      .default("pending"),
    checkoutUrl: text("checkout_url").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
  },
  (table) => [index("payment_transactions_booking_id_idx").on(table.bookingId)]
);

export const paymentWebhookEventsTable = pgTable("payment_webhook_events", {
  eventId: text("event_id").primaryKey(),
  provider: text("provider").$type<PaymentProvider>().notNull(),
  transactionId: text("transaction_id").notNull(),
  bookingId: text("booking_id").notNull(),
  outcome: text("outcome").$type<PaymentOutcome>().notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull(),
});

export const notificationLogsTable = pgTable(
  "notification_logs",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => reservationsTable.bookingId, { onDelete: "cascade" }),
    recipientEmail: text("recipient_email").notNull(),
    channel: text("channel").$type<"email">().notNull().default("email"),
    type: text("type").$type<NotificationType>().notNull(),
    subject: text("subject").notNull(),
    previewText: text("preview_text").notNull(),
    htmlBody: text("html_body").notNull(),
    status: text("status").$type<"sent" | "logged">().notNull().default("logged"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("notification_logs_booking_id_idx").on(table.bookingId)]
);
