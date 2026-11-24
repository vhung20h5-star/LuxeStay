import crypto from "node:crypto";

export const WEBHOOK_SIGNATURE_HEADER = "x-luxestay-signature";

export function signWebhookPayload(rawBody: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return `sha256=${hmac}`;
}

export function verifyWebhookSignature(
  rawBody: string,
  providedSignature: string | undefined | null,
  secret: string
): boolean {
  if (!providedSignature) return false;
  const expected = signWebhookPayload(rawBody, secret);
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(providedSignature.trim(), "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}
