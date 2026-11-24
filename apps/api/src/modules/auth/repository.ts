import type { AuthProvider, AuthUser } from "@luxestay/contracts";
import { normalizeContactPhone } from "@luxestay/domain";

export interface StoredAuthUser extends AuthUser {
  passwordHash?: string;
}

export interface StoredUserSession {
  tokenHash: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export interface StoredOtpChallenge {
  id: string;
  identifier: string;
  channel: "email" | "sms";
  codeHash: string;
  attempts: number;
  expiresAt: string;
  consumedAt?: string;
  createdAt: string;
}

export interface ApiAuthRepository {
  createUser(user: StoredAuthUser): Promise<StoredAuthUser>;
  findUserById(id: string): Promise<StoredAuthUser | null>;
  findUserByEmail(email: string): Promise<StoredAuthUser | null>;
  findUserByPhone(phone: string): Promise<StoredAuthUser | null>;
  updateUserProfile(
    userId: string,
    patch: { fullName?: string; phone?: string; avatar?: string; provider?: AuthProvider }
  ): Promise<StoredAuthUser | null>;

  createSession(session: StoredUserSession): Promise<void>;
  findSessionByTokenHash(tokenHash: string): Promise<StoredUserSession | null>;
  deleteSessionByTokenHash(tokenHash: string): Promise<void>;

  createOtpChallenge(challenge: StoredOtpChallenge): Promise<void>;
  findLatestOtpChallenge(identifier: string): Promise<StoredOtpChallenge | null>;
  incrementOtpAttempts(challengeId: string): Promise<number>;
  markOtpConsumed(challengeId: string, consumedAt: string): Promise<void>;
}

export function toPublicAuthUser(user: StoredAuthUser): AuthUser {
  return Object.freeze({
    id: user.id,
    email: user.email,
    ...(user.phone ? { phone: user.phone } : {}),
    fullName: user.fullName,
    ...(user.avatar ? { avatar: user.avatar } : {}),
    provider: user.provider,
    createdAt: user.createdAt,
  });
}

export function createInMemoryAuthRepository(): ApiAuthRepository {
  const usersById = new Map<string, StoredAuthUser>();
  const sessionsByHash = new Map<string, StoredUserSession>();
  const challenges: StoredOtpChallenge[] = [];

  return {
    async createUser(user) {
      const normalized: StoredAuthUser = {
        ...user,
        email: user.email.trim().toLowerCase(),
        phone: user.phone ? (normalizeContactPhone(user.phone) ?? user.phone.trim()) : undefined,
      };
      usersById.set(normalized.id, normalized);
      return normalized;
    },

    async findUserById(id) {
      return usersById.get(id) ?? null;
    },

    async findUserByEmail(email) {
      const target = email.trim().toLowerCase();
      for (const user of usersById.values()) {
        if (user.email === target) return user;
      }
      return null;
    },

    async findUserByPhone(phone) {
      const target = normalizeContactPhone(phone);
      if (!target) return null;
      for (const user of usersById.values()) {
        if (user.phone && normalizeContactPhone(user.phone) === target) {
          return user;
        }
      }
      return null;
    },

    async updateUserProfile(userId, patch) {
      const existing = usersById.get(userId);
      if (!existing) return null;
      const updated: StoredAuthUser = {
        ...existing,
        ...(patch.fullName ? { fullName: patch.fullName } : {}),
        ...(patch.phone ? { phone: normalizeContactPhone(patch.phone) ?? patch.phone } : {}),
        ...(patch.avatar ? { avatar: patch.avatar } : {}),
        ...(patch.provider ? { provider: patch.provider } : {}),
      };
      usersById.set(userId, updated);
      return updated;
    },

    async createSession(session) {
      sessionsByHash.set(session.tokenHash, session);
    },

    async findSessionByTokenHash(tokenHash) {
      return sessionsByHash.get(tokenHash) ?? null;
    },

    async deleteSessionByTokenHash(tokenHash) {
      sessionsByHash.delete(tokenHash);
    },

    async createOtpChallenge(challenge) {
      challenges.push({ ...challenge });
    },

    async findLatestOtpChallenge(identifier) {
      const target = identifier.trim().toLowerCase();
      for (let i = challenges.length - 1; i >= 0; i -= 1) {
        if (challenges[i].identifier === target) {
          return { ...challenges[i] };
        }
      }
      return null;
    },

    async incrementOtpAttempts(challengeId) {
      const found = challenges.find((c) => c.id === challengeId);
      if (!found) return 0;
      found.attempts += 1;
      return found.attempts;
    },

    async markOtpConsumed(challengeId, consumedAt) {
      const found = challenges.find((c) => c.id === challengeId);
      if (found) {
        found.consumedAt = consumedAt;
      }
    },
  };
}
