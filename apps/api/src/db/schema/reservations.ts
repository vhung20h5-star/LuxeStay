import {
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type {
  AmenityCategoryId,
  PaymentMethod,
  ReservationStatus,
} from "@luxestay/contracts";
import { propertiesTable } from "./catalog.js";
import { usersTable } from "./auth.js";

export const reservationsTable = pgTable(
  "reservations",
  {
    bookingId: text("booking_id").primaryKey(),
    propertyId: text("property_id")
      .notNull()
      .references(() => propertiesTable.id),
    userId: text("user_id").references(() => usersTable.id, { onDelete: "set null" }),
    status: text("status").$type<ReservationStatus>().notNull().default("confirmed"),
    checkIn: text("check_in").notNull(),
    checkOut: text("check_out").notNull(),
    nights: integer("nights").notNull(),
    adults: integer("adults").notNull(),
    children: integer("children").notNull().default(0),
    rooms: integer("rooms").notNull().default(1),
    basePrice: integer("base_price").notNull(),
    nightsTotal: integer("nights_total").notNull(),
    cleaningFee: integer("cleaning_fee").notNull(),
    serviceFee: integer("service_fee").notNull().default(0),
    amenitiesFee: integer("amenities_fee").notNull().default(0),
    discount: integer("discount").notNull().default(0),
    appliedPromoCode: text("applied_promo_code"),
    total: integer("total").notNull(),
    guestFullName: text("guest_full_name").notNull(),
    guestEmail: text("guest_email").notNull(),
    guestPhone: text("guest_phone").notNull(),
    guestNote: text("guest_note"),
    paymentMethod: text("payment_method").$type<PaymentMethod>().notNull(),
    paymentExpiresAt: timestamp("payment_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),
  },
  (table) => [
    index("reservations_property_id_idx").on(table.propertyId),
    index("reservations_guest_email_idx").on(table.guestEmail),
    index("reservations_user_id_idx").on(table.userId),
  ]
);

export const reservationAmenitiesTable = pgTable(
  "reservation_amenities",
  {
    bookingId: text("booking_id")
      .notNull()
      .references(() => reservationsTable.bookingId, { onDelete: "cascade" }),
    amenityId: text("amenity_id").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    name: text("name").notNull(),
    category: text("category").$type<AmenityCategoryId>().notNull(),
    pricingType: text("pricing_type").$type<"free-reservation" | "paid">().notNull(),
    price: integer("price").notNull().default(0),
    priceUnit: text("price_unit"),
  },
  (table) => [primaryKey({ columns: [table.bookingId, table.amenityId] })]
);
