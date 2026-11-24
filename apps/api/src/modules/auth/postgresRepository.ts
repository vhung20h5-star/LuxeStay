import { desc, eq, sql } from "drizzle-orm";
import { normalizeContactPhone } from "@luxestay/domain";
import type { LuxeStayDb } from "../../db/client.js";
import {
  otpChallengesTable,
  userSessionsTable,
  usersTable,
} from "../../db/schema/index.js";
import type {
  ApiAuthRepository,
  StoredAuthUser,
  StoredOtpChallenge,
  StoredUserSession,
} from "./repository.js";

function mapUserRow(row: typeof usersTable.$inferSelect): StoredAuthUser {
  return {
    id: row.id,
    email: row.email,
    ...(row.phone ? { phone: row.phone } : {}),
    fullName: row.fullName,
    ...(row.avatar ? { avatar: row.avatar } : {}),
    provider: row.provider,
    role: row.role ?? "guest",
    ...(row.passwordHash ? { passwordHash: row.passwordHash } : {}),
    createdAt: row.createdAt.toISOString(),
  };
}

export function createPostgresAuthRepository(db: LuxeStayDb): ApiAuthRepository {
  return {
    async createUser(user) {
      const email = user.email.trim().toLowerCase();
      const phone = user.phone
        ? (normalizeContactPhone(user.phone) ?? user.phone.trim())
        : null;
      await db.insert(usersTable).values({
        id: user.id,
        email,
        phone,
        fullName: user.fullName,
        avatar: user.avatar ?? null,
        provider: user.provider,
        role: user.role ?? "guest",
        passwordHash: user.passwordHash ?? null,
        createdAt: new Date(user.createdAt),
      });
      return {
        ...user,
        role: user.role ?? "guest",
        email,
        ...(phone ? { phone } : {}),
      };
    },

    async findUserById(id) {
      const rows = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, id))
        .limit(1);
      return rows[0] ? mapUserRow(rows[0]) : null;
    },

    async findUserByEmail(email) {
      const rows = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email.trim().toLowerCase()))
        .limit(1);
      return rows[0] ? mapUserRow(rows[0]) : null;
    },

    async findUserByPhone(phone) {
      const normalized = normalizeContactPhone(phone);
      if (!normalized) return null;
      const rows = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.phone, normalized))
        .limit(1);
      return rows[0] ? mapUserRow(rows[0]) : null;
    },

    async updateUserProfile(userId, patch) {
      const updateSet: Partial<typeof usersTable.$inferInsert> = {};
      if (patch.fullName) updateSet.fullName = patch.fullName;
      if (patch.phone) updateSet.phone = normalizeContactPhone(patch.phone) ?? patch.phone;
      if (patch.avatar) updateSet.avatar = patch.avatar;
      if (patch.provider) updateSet.provider = patch.provider;

      if (Object.keys(updateSet).length > 0) {
        await db.update(usersTable).set(updateSet).where(eq(usersTable.id, userId));
      }
      return this.findUserById(userId);
    },

    async createSession(session) {
      await db.insert(userSessionsTable).values({
        tokenHash: session.tokenHash,
        userId: session.userId,
        expiresAt: new Date(session.expiresAt),
        createdAt: new Date(session.createdAt),
      });
    },

    async findSessionByTokenHash(tokenHash): Promise<StoredUserSession | null> {
      const rows = await db
        .select()
        .from(userSessionsTable)
        .where(eq(userSessionsTable.tokenHash, tokenHash))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        tokenHash: row.tokenHash,
        userId: row.userId,
        expiresAt: row.expiresAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
      };
    },

    async deleteSessionByTokenHash(tokenHash) {
      await db
        .delete(userSessionsTable)
        .where(eq(userSessionsTable.tokenHash, tokenHash));
    },

    async createOtpChallenge(challenge) {
      await db.insert(otpChallengesTable).values({
        id: challenge.id,
        identifier: challenge.identifier,
        channel: challenge.channel,
        codeHash: challenge.codeHash,
        attempts: challenge.attempts,
        expiresAt: new Date(challenge.expiresAt),
        consumedAt: challenge.consumedAt ? new Date(challenge.consumedAt) : null,
        createdAt: new Date(challenge.createdAt),
      });
    },

    async findLatestOtpChallenge(identifier): Promise<StoredOtpChallenge | null> {
      const rows = await db
        .select()
        .from(otpChallengesTable)
        .where(eq(otpChallengesTable.identifier, identifier.trim().toLowerCase()))
        .orderBy(desc(otpChallengesTable.createdAt))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        id: row.id,
        identifier: row.identifier,
        channel: row.channel,
        codeHash: row.codeHash,
        attempts: row.attempts,
        expiresAt: row.expiresAt.toISOString(),
        consumedAt: row.consumedAt ? row.consumedAt.toISOString() : undefined,
        createdAt: row.createdAt.toISOString(),
      };
    },

    async incrementOtpAttempts(challengeId) {
      const updated = await db
        .update(otpChallengesTable)
        .set({ attempts: sql`${otpChallengesTable.attempts} + 1` })
        .where(eq(otpChallengesTable.id, challengeId))
        .returning({ attempts: otpChallengesTable.attempts });
      return updated[0]?.attempts ?? 0;
    },

    async markOtpConsumed(challengeId, consumedAt) {
      await db
        .update(otpChallengesTable)
        .set({ consumedAt: new Date(consumedAt) })
        .where(eq(otpChallengesTable.id, challengeId));
    },
  };
}
