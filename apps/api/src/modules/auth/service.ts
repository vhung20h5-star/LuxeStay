import crypto from "node:crypto";
import type {
  AuthUser,
  ErrorCode,
  LoginInput,
  OtpRequestInput,
  OtpRequestResult,
  OtpVerifyInput,
  RegisterInput,
} from "@luxestay/contracts";
import { normalizeContactPhone } from "@luxestay/domain";
import {
  generateId,
  generateOpaqueToken,
  generateSixDigitOtp,
  hashOpaqueToken,
  hashPassword,
  verifyPassword,
} from "./crypto.js";
import { toPublicAuthUser, type ApiAuthRepository, type StoredAuthUser } from "./repository.js";

const OTP_TTL_MS = 5 * 60_000;
const MAX_OTP_ATTEMPTS = 5;

export type AuthOperationResult<T> =
  | { ok: true; data: T; sessionToken?: string }
  | { ok: false; code: ErrorCode; message: string; status: 400 | 401 | 409 };

export interface AuthService {
  register(input: RegisterInput): Promise<AuthOperationResult<{ user: AuthUser }>>;
  login(input: LoginInput): Promise<AuthOperationResult<{ user: AuthUser }>>;
  requestOtp(input: OtpRequestInput): Promise<AuthOperationResult<OtpRequestResult>>;
  verifyOtp(input: OtpVerifyInput): Promise<AuthOperationResult<{ user: AuthUser }>>;
  resolveSession(rawToken: string): Promise<AuthUser | null>;
  logout(rawToken: string | null): Promise<void>;
}

function normalizeIdentifier(raw: string): { normalized: string; channel: "email" | "sms" } {
  const trimmed = raw.trim();
  if (trimmed.includes("@")) {
    return { normalized: trimmed.toLowerCase(), channel: "email" };
  }
  const phone = normalizeContactPhone(trimmed) ?? trimmed.replace(/[\s.-]/g, "");
  return { normalized: phone, channel: "sms" };
}

export function createAuthService(deps: {
  authRepository: ApiAuthRepository;
  sessionTtlDays: number;
  exposeDevOtpCode: boolean;
}): AuthService {
  const sessionTtlMs = Math.max(1, deps.sessionTtlDays) * 86_400_000;

  async function issueSession(userId: string): Promise<string> {
    const rawToken = generateOpaqueToken();
    const now = Date.now();
    await deps.authRepository.createSession({
      tokenHash: hashOpaqueToken(rawToken),
      userId,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + sessionTtlMs).toISOString(),
    });
    return rawToken;
  }

  return {
    async register(input) {
      const email = input.email.trim().toLowerCase();
      const existing = await deps.authRepository.findUserByEmail(email);
      if (existing) {
        return {
          ok: false,
          code: "CONFLICT",
          message: "Email này đã được đăng ký tài khoản LuxeStay. Vui lòng đăng nhập.",
          status: 409,
        };
      }

      const nowIso = new Date().toISOString();
      const storedUser: StoredAuthUser = {
        id: generateId("USR"),
        email,
        ...(input.phone ? { phone: input.phone } : {}),
        fullName: input.fullName.trim(),
        provider: "password",
        role: "guest",
        passwordHash: hashPassword(input.password),
        createdAt: nowIso,
      };

      const created = await deps.authRepository.createUser(storedUser);
      const sessionToken = await issueSession(created.id);
      return {
        ok: true,
        data: { user: toPublicAuthUser(created) },
        sessionToken,
      };
    },

    async login(input) {
      const email = input.email.trim().toLowerCase();
      const user = await deps.authRepository.findUserByEmail(email);
      if (!user || !user.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
        return {
          ok: false,
          code: "UNAUTHORIZED",
          message: "Email hoặc mật khẩu không chính xác.",
          status: 401,
        };
      }

      const sessionToken = await issueSession(user.id);
      return {
        ok: true,
        data: { user: toPublicAuthUser(user) },
        sessionToken,
      };
    },

    async requestOtp(input) {
      const { normalized, channel } = normalizeIdentifier(input.identifier);
      const code = generateSixDigitOtp();
      const now = Date.now();
      const expiresAt = new Date(now + OTP_TTL_MS).toISOString();

      await deps.authRepository.createOtpChallenge({
        id: generateId("OTP"),
        identifier: normalized,
        channel,
        codeHash: hashOpaqueToken(code),
        attempts: 0,
        expiresAt,
        createdAt: new Date(now).toISOString(),
      });

      return {
        ok: true,
        data: {
          identifier: normalized,
          channel,
          expiresAt,
          ...(deps.exposeDevOtpCode ? { devCode: code } : {}),
        },
      };
    },

    async verifyOtp(input) {
      const { normalized, channel } = normalizeIdentifier(input.identifier);
      const challenge = await deps.authRepository.findLatestOtpChallenge(normalized);

      if (!challenge || challenge.consumedAt) {
        return {
          ok: false,
          code: "UNAUTHORIZED",
          message: "Mã OTP không tồn tại hoặc đã được sử dụng. Vui lòng yêu cầu mã mới.",
          status: 401,
        };
      }

      if (Date.now() > Date.parse(challenge.expiresAt)) {
        return {
          ok: false,
          code: "UNAUTHORIZED",
          message: "Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã mới.",
          status: 401,
        };
      }

      if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
        return {
          ok: false,
          code: "UNAUTHORIZED",
          message: "Bạn đã nhập sai OTP quá số lần quy định. Vui lòng yêu cầu mã mới.",
          status: 401,
        };
      }

      const expectedBuf = Buffer.from(challenge.codeHash, "hex");
      const actualBuf = Buffer.from(hashOpaqueToken(input.code.trim()), "hex");
      const matches =
        expectedBuf.length === actualBuf.length &&
        crypto.timingSafeEqual(expectedBuf, actualBuf);

      if (!matches) {
        await deps.authRepository.incrementOtpAttempts(challenge.id);
        return {
          ok: false,
          code: "UNAUTHORIZED",
          message: "Mã OTP không chính xác. Vui lòng kiểm tra lại.",
          status: 401,
        };
      }

      await deps.authRepository.markOtpConsumed(challenge.id, new Date().toISOString());

      let user =
        channel === "email"
          ? await deps.authRepository.findUserByEmail(normalized)
          : await deps.authRepository.findUserByPhone(normalized);

      if (!user) {
        const nowIso = new Date().toISOString();
        const fallbackName =
          input.fullName?.trim() ||
          (channel === "email"
            ? normalized.split("@")[0] || "Thành viên LuxeStay"
            : `Khách ${normalized.slice(-4)}`);
        const syntheticEmail =
          channel === "email" ? normalized : `phone-${normalized}@otp.luxestay.local`;

        user = await deps.authRepository.createUser({
          id: generateId("USR"),
          email: syntheticEmail,
          ...(channel === "sms" ? { phone: normalized } : {}),
          fullName: fallbackName,
          provider: "otp",
          role: "guest",
          createdAt: nowIso,
        });
      } else if (input.fullName?.trim() && input.fullName.trim() !== user.fullName) {
        const updated = await deps.authRepository.updateUserProfile(user.id, {
          fullName: input.fullName.trim(),
        });
        if (updated) user = updated;
      }

      const sessionToken = await issueSession(user.id);
      return {
        ok: true,
        data: { user: toPublicAuthUser(user) },
        sessionToken,
      };
    },

    async resolveSession(rawToken) {
      if (!rawToken) return null;
      const session = await deps.authRepository.findSessionByTokenHash(
        hashOpaqueToken(rawToken)
      );
      if (!session) return null;

      if (Date.now() > Date.parse(session.expiresAt)) {
        await deps.authRepository.deleteSessionByTokenHash(session.tokenHash);
        return null;
      }

      const user = await deps.authRepository.findUserById(session.userId);
      return user ? toPublicAuthUser(user) : null;
    },

    async logout(rawToken) {
      if (!rawToken) return;
      await deps.authRepository.deleteSessionByTokenHash(hashOpaqueToken(rawToken));
    },
  };
}
