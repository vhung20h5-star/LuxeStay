import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type {
  ActivityBookingStatus,
  ActivityCategory,
  ActivitySlot,
  PaymentMethod,
  TransferDetails,
} from "@luxestay/contracts";
import { usersTable } from "./auth.js";
import { reservationsTable } from "./reservations.js";

export const travelActivitiesTable = pgTable(
  "travel_activities",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    subtitle: text("subtitle").notNull(),
    category: text("category").$type<ActivityCategory>().notNull(),
    destinationCity: text("destination_city").notNull(),
    province: text("province").notNull(),
    meetingPoint: text("meeting_point").notNull(),
    durationLabel: text("duration_label").notNull(),
    pricePerUnit: integer("price_per_unit").notNull(),
    unitLabel: text("unit_label").notNull(),
    originalPrice: integer("original_price"),
    rating: real("rating").notNull().default(5),
    reviewCount: integer("review_count").notNull().default(0),
    images: jsonb("images").$type<string[]>().notNull(),
    highlights: jsonb("highlights").$type<string[]>().notNull(),
    included: jsonb("included").$type<string[]>().notNull(),
    freeCancellation: boolean("free_cancellation").notNull().default(true),
    instantConfirmation: boolean("instant_confirmation").notNull().default(true),
    slots: jsonb("slots").$type<ActivitySlot[]>().notNull(),
    transferDetails: jsonb("transfer_details").$type<TransferDetails>(),
    isFeatured: boolean("is_featured").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    index("travel_activities_city_idx").on(table.destinationCity),
    index("travel_activities_category_idx").on(table.category),
  ]
);

export const activityBookingsTable = pgTable(
  "activity_bookings",
  {
    bookingId: text("booking_id").primaryKey(),
    activityId: text("activity_id")
      .notNull()
      .references(() => travelActivitiesTable.id),
    userId: text("user_id").references(() => usersTable.id, { onDelete: "set null" }),
    linkedReservationId: text("linked_reservation_id"),
    activitySlug: text("activity_slug").notNull(),
    activityTitle: text("activity_title").notNull(),
    activityCategory: text("activity_category").$type<ActivityCategory>().notNull(),
    activityImage: text("activity_image").notNull(),
    destinationCity: text("destination_city").notNull(),
    slotId: text("slot_id").notNull(),
    slotLabel: text("slot_label").notNull(),
    dateIso: text("date_iso").notNull(),
    quantity: integer("quantity").notNull(),
    unitLabel: text("unit_label").notNull(),
    unitPrice: integer("unit_price").notNull(),
    subtotal: integer("subtotal").notNull(),
    discount: integer("discount").notNull().default(0),
    appliedPromoCode: text("applied_promo_code"),
    total: integer("total").notNull(),
    guestFullName: text("guest_full_name").notNull(),
    guestEmail: text("guest_email").notNull(),
    guestPhone: text("guest_phone").notNull(),
    guestNote: text("guest_note"),
    paymentMethod: text("payment_method").$type<PaymentMethod>().notNull(),
    freeCancellation: boolean("free_cancellation").notNull().default(true),
    status: text("status").$type<ActivityBookingStatus>().notNull().default("confirmed"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),
  },
  (table) => [
    index("activity_bookings_slot_idx").on(
      table.activityId,
      table.slotId,
      table.dateIso,
      table.status
    ),
    index("activity_bookings_user_id_idx").on(table.userId),
    index("activity_bookings_guest_email_idx").on(table.guestEmail),
  ]
);

export const reservationActivitiesTable = pgTable(
  "reservation_activities",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => reservationsTable.bookingId, { onDelete: "cascade" }),
    activityId: text("activity_id")
      .notNull()
      .references(() => travelActivitiesTable.id),
    sortOrder: integer("sort_order").notNull().default(0),
    activitySlug: text("activity_slug").notNull(),
    activityTitle: text("activity_title").notNull(),
    activityCategory: text("activity_category").$type<ActivityCategory>().notNull(),
    slotId: text("slot_id").notNull(),
    slotLabel: text("slot_label").notNull(),
    dateIso: text("date_iso").notNull(),
    quantity: integer("quantity").notNull(),
    unitLabel: text("unit_label").notNull(),
    unitPrice: integer("unit_price").notNull(),
    totalPrice: integer("total_price").notNull(),
    status: text("status").$type<ActivityBookingStatus>().notNull().default("confirmed"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),
  },
  (table) => [
    index("reservation_activities_booking_id_idx").on(table.bookingId),
    index("reservation_activities_slot_idx").on(
      table.activityId,
      table.slotId,
      table.dateIso,
      table.status
    ),
  ]
);
