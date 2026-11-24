import type {
  PaymentOutcome,
  PaymentProvider,
  PaymentTransaction,
} from "@luxestay/contracts";

export interface StoredWebhookEvent {
  eventId: string;
  provider: PaymentProvider;
  transactionId: string;
  bookingId: string;
  outcome: PaymentOutcome;
  processedAt: string;
}

export interface ApiPaymentRepository {
  createTransaction(tx: PaymentTransaction): Promise<PaymentTransaction>;
  findByTransactionId(transactionId: string): Promise<PaymentTransaction | null>;
  findLatestByBookingId(bookingId: string): Promise<PaymentTransaction | null>;
  updateTransaction(tx: PaymentTransaction): Promise<PaymentTransaction>;
  hasWebhookEvent(eventId: string): Promise<boolean>;
  recordWebhookEvent(event: StoredWebhookEvent): Promise<boolean>;
}

export function createInMemoryPaymentRepository(): ApiPaymentRepository {
  const byTxId = new Map<string, PaymentTransaction>();
  const events = new Map<string, StoredWebhookEvent>();

  return {
    async createTransaction(tx) {
      const normalizedId = tx.transactionId.trim().toUpperCase();
      const stored = Object.freeze({ ...tx, transactionId: normalizedId });
      byTxId.set(normalizedId, stored);
      return stored;
    },

    async findByTransactionId(transactionId) {
      return byTxId.get(transactionId.trim().toUpperCase()) ?? null;
    },

    async findLatestByBookingId(bookingId) {
      const target = bookingId.trim().toUpperCase();
      const matches = [...byTxId.values()]
        .filter((tx) => tx.bookingId.trim().toUpperCase() === target)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return matches[0] ?? null;
    },

    async updateTransaction(tx) {
      const normalizedId = tx.transactionId.trim().toUpperCase();
      const stored = Object.freeze({ ...tx, transactionId: normalizedId });
      byTxId.set(normalizedId, stored);
      return stored;
    },

    async hasWebhookEvent(eventId) {
      return events.has(eventId.trim());
    },

    async recordWebhookEvent(event) {
      const key = event.eventId.trim();
      if (events.has(key)) return false;
      events.set(key, Object.freeze({ ...event, eventId: key }));
      return true;
    },
  };
}
