import { createHmac } from "crypto";
import { logger } from "@/lib/logger";

// ─── Token structure ─────────────────────────────────────────────────────────

interface SigningTokenPayload {
  baaId: string;
  vendorId: string;
  /** Unix timestamp in seconds when the token expires (72 hours from creation). */
  expiresAt: number;
}

interface VerifiedToken {
  baaId: string;
  vendorId: string;
  expiresAt: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TOKEN_EXPIRY_HOURS = 72;
const HMAC_ALGORITHM = "sha256";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not configured");
  }
  return secret;
}

function createSignature(data: string): string {
  return createHmac(HMAC_ALGORITHM, getSecret()).update(data).digest("hex");
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate a signing token for a BAA. The token is a base64url-encoded JSON
 * payload with an HMAC-SHA256 signature appended. Valid for 72 hours.
 */
export function generateSigningToken(baaId: string, vendorId: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_HOURS * 3600;

  const payload: SigningTokenPayload = { baaId, vendorId, expiresAt };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr).toString("base64url");
  const signature = createSignature(payloadB64);

  const token = `${payloadB64}.${signature}`;

  logger.info("Signing token generated", {
    baaId,
    vendorId,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  });

  return token;
}

/**
 * Verify and decode a signing token. Returns the decoded payload if valid,
 * or null if the token is malformed, has an invalid signature, or has expired.
 */
export function verifySigningToken(token: string): VerifiedToken | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) {
      logger.warn("Signing token verification failed: malformed token");
      return null;
    }

    const [payloadB64, signature] = parts;
    const expectedSignature = createSignature(payloadB64);

    // Constant-time comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) {
      logger.warn("Signing token verification failed: signature length mismatch");
      return null;
    }

    let signatureValid = true;
    for (let i = 0; i < signature.length; i++) {
      if (signature.charCodeAt(i) !== expectedSignature.charCodeAt(i)) {
        signatureValid = false;
      }
    }

    if (!signatureValid) {
      logger.warn("Signing token verification failed: invalid signature");
      return null;
    }

    const payloadStr = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload = JSON.parse(payloadStr) as SigningTokenPayload;

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.expiresAt < now) {
      logger.warn("Signing token verification failed: token expired", {
        baaId: payload.baaId,
        expiredAt: new Date(payload.expiresAt * 1000).toISOString(),
      });
      return null;
    }

    return {
      baaId: payload.baaId,
      vendorId: payload.vendorId,
      expiresAt: payload.expiresAt,
    };
  } catch (error) {
    logger.error("Signing token verification error", {
      error: String(error),
    });
    return null;
  }
}
