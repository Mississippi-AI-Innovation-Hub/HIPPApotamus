import { createHmac, randomInt } from "crypto";
import { logger } from "@/lib/logger";

// ─── In-memory OTP store (use DynamoDB/Redis in production) ─────────────────

interface OTPRecord {
  code: string;
  baaId: string;
  vendorId: string;
  email: string;
  expiresAt: number; // Unix timestamp in seconds
  attempts: number;
  lockedUntil: number | null;
  verified: boolean;
}

const otpStore = new Map<string, OTPRecord>();

// ─── Constants ──────────────────────────────────────────────────────────────

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 30;

// ─── Key helper ─────────────────────────────────────────────────────────────

function otpKey(baaId: string, vendorId: string): string {
  return `${baaId}:${vendorId}`;
}

// ─── Generate & store OTP ───────────────────────────────────────────────────

export function generateOTP(baaId: string, vendorId: string, email: string): string {
  const key = otpKey(baaId, vendorId);
  const existing = otpStore.get(key);

  // Check lockout
  if (existing?.lockedUntil && existing.lockedUntil > Math.floor(Date.now() / 1000)) {
    const remainingMinutes = Math.ceil((existing.lockedUntil - Math.floor(Date.now() / 1000)) / 60);
    throw new Error(`Too many failed attempts. Try again in ${remainingMinutes} minutes.`);
  }

  // Generate 6-digit code
  const code = String(randomInt(100000, 999999));
  const expiresAt = Math.floor(Date.now() / 1000) + OTP_EXPIRY_MINUTES * 60;

  otpStore.set(key, {
    code,
    baaId,
    vendorId,
    email,
    expiresAt,
    attempts: 0,
    lockedUntil: null,
    verified: false,
  });

  logger.info("OTP generated", { baaId, vendorId, email: maskEmail(email) });

  return code;
}

// ─── Verify OTP ─────────────────────────────────────────────────────────────

export function verifyOTP(
  baaId: string,
  vendorId: string,
  code: string,
): { valid: boolean; error?: string; attemptsRemaining?: number } {
  const key = otpKey(baaId, vendorId);
  const record = otpStore.get(key);

  if (!record) {
    return { valid: false, error: "No verification code found. Please request a new one." };
  }

  // Check lockout
  if (record.lockedUntil && record.lockedUntil > Math.floor(Date.now() / 1000)) {
    const remainingMinutes = Math.ceil((record.lockedUntil - Math.floor(Date.now() / 1000)) / 60);
    return { valid: false, error: `Account locked. Try again in ${remainingMinutes} minutes.` };
  }

  // Check expiry
  if (record.expiresAt < Math.floor(Date.now() / 1000)) {
    otpStore.delete(key);
    return { valid: false, error: "Verification code expired. Please request a new one." };
  }

  // Check code — constant time comparison
  const codeMatch = constantTimeEqual(code, record.code);

  if (!codeMatch) {
    record.attempts += 1;
    const attemptsRemaining = MAX_ATTEMPTS - record.attempts;

    if (record.attempts >= MAX_ATTEMPTS) {
      record.lockedUntil = Math.floor(Date.now() / 1000) + LOCKOUT_MINUTES * 60;
      logger.warn("OTP lockout triggered", { baaId, vendorId, attempts: record.attempts });
      return { valid: false, error: `Too many failed attempts. Locked for ${LOCKOUT_MINUTES} minutes.`, attemptsRemaining: 0 };
    }

    logger.warn("OTP verification failed", { baaId, vendorId, attempts: record.attempts });
    return { valid: false, error: `Incorrect code. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining.`, attemptsRemaining };
  }

  // Mark as verified
  record.verified = true;
  logger.info("OTP verified successfully", { baaId, vendorId });

  return { valid: true };
}

// ─── Check if OTP is verified ───────────────────────────────────────────────

export function isOTPVerified(baaId: string, vendorId: string): boolean {
  const key = otpKey(baaId, vendorId);
  const record = otpStore.get(key);
  return record?.verified === true;
}

// ─── Generate session token after OTP verification ──────────────────────────

export function generateOTPSessionToken(baaId: string, vendorId: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? "dev-secret";
  const payload = JSON.stringify({ baaId, vendorId, verifiedAt: Date.now() });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", secret).update(`otp:${payloadB64}`).digest("hex");
  return `${payloadB64}.${sig}`;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const masked = local.length <= 2 ? "*".repeat(local.length) : `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}`;
  return `${masked}@${domain}`;
}

export { maskEmail };
