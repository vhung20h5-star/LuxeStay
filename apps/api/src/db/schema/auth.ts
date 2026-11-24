import {
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { AuthProvider } from "@luxestay/contracts";
import { propertiesTable } from "./catalog.js";

export const usersTable = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    phone: text("phone"),
    fullName: text("full_name").notNull(),
    avatar: text("avatar"),
    provider: text("provider").$type<AuthProvider>().notNull().default("password"),
    passwordHash: text("password_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("users_phone_idx").on(table.phone)]
);

export const userSessionsTable = pgTable(
  "user_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("user_sessions_user_id_idx").on(table.userId)]
);

export const otpChallengesTable = pgTable(
  "otp_challenges",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    channel: text("channel").$type<"email" | "sms">().notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("otp_challenges_identifier_idx").on(table.identifier)]
);

export const userFavoritesTable = pgTable(
  "user_favorites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    propertyId: text("property_id")
      .notNull()
      .references(() => propertiesTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.propertyId] })]
);
