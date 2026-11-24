import crypto from "node:crypto";

const SCRYPT_KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }
  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  const expectedBuf = Buffer.from(expectedHex, "hex");
  const actualBuf = crypto.scryptSync(password, salt, expectedBuf.length);
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

export function hashOpaqueToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateSixDigitOtp(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
}

/**
 * Seam for future OAuth providers (e.g., Google OAuth2 when GOOGLE_CLIENT_ID is configured).
 */
export interface OAuthProfile {
  provider: "google";
  email: string;
  fullName: string;
  avatar?: string;
}

export interface OAuthProviderSeam {
  readonly provider: "google";
  isConfigured(): boolean;
  exchangeCodeForProfile(code: string): Promise<OAuthProfile>;
}
