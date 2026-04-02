import { NextRequest, NextResponse } from "next/server";
import { getBAAById, getVendorById, addAuditLog } from "@/lib/db";
import { verifySigningToken } from "@/lib/signing/token";
import { verifyOTP, generateOTPSessionToken } from "@/lib/signing/otp";
import { logger } from "@/lib/logger";

/**
 * POST /api/baas/[id]/verify-otp
 * Verifies the 6-digit OTP and returns a session token for accessing the signing page.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as { token?: string; code?: string };

    if (!body.token || !body.code) {
      return NextResponse.json({ error: "Token and code required" }, { status: 400 });
    }

    // Verify the magic link token
    const tokenResult = verifySigningToken(body.token);
    if (!tokenResult || tokenResult.baaId !== id) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const baa = await getBAAById(id);
    if (!baa) {
      return NextResponse.json({ error: "BAA not found" }, { status: 404 });
    }

    const vendor = await getVendorById(baa.vendorId);
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Verify OTP
    const result = verifyOTP(baa.id, vendor.id, body.code.trim());
    const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? null;

    if (!result.valid) {
      // Log failed attempt
      await addAuditLog({
        baaId: baa.id,
        vendorId: vendor.id,
        action: result.attemptsRemaining === 0 ? "OTP_LOCKED_OUT" : "OTP_FAILED",
        performedBy: vendor.contactEmail,
        details: { error: result.error ?? "", attemptsRemaining: result.attemptsRemaining ?? 0 },
        ipAddress: ip,
      });

      return NextResponse.json(
        { error: result.error, attemptsRemaining: result.attemptsRemaining },
        { status: result.attemptsRemaining === 0 ? 429 : 400 },
      );
    }

    // OTP verified — generate session token
    const sessionToken = generateOTPSessionToken(baa.id, vendor.id);

    // Log success
    await addAuditLog({
      baaId: baa.id,
      vendorId: vendor.id,
      action: "OTP_VERIFIED",
      performedBy: vendor.contactEmail,
      details: { message: "Identity verified via email OTP" },
      ipAddress: ip,
    });

    logger.info("OTP verified", { baaId: baa.id, vendorId: vendor.id });

    return NextResponse.json({ success: true, sessionToken });
  } catch (error) {
    logger.error("OTP verify error", { baaId: id, error: String(error) });
    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 },
    );
  }
}
