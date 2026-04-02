import { NextRequest, NextResponse } from "next/server";
import { getBAAById, getVendorById, addAuditLog } from "@/lib/db";
import { verifySigningToken } from "@/lib/signing/token";
import { generateOTP, maskEmail } from "@/lib/signing/otp";
import { sendEmail } from "@/lib/email/sender";
import { logger } from "@/lib/logger";

/**
 * POST /api/baas/[id]/otp
 * Sends a 6-digit OTP to the vendor's registered email.
 * Requires a valid signing token.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as { token?: string };

    if (!body.token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
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

    // Generate OTP
    let code: string;
    try {
      code = generateOTP(baa.id, vendor.id, vendor.contactEmail);
    } catch (err) {
      // Lockout error
      return NextResponse.json(
        { error: (err as Error).message },
        { status: 429 },
      );
    }

    // Log OTP to console for development (remove in production)
    logger.info("OTP CODE FOR TESTING", { baaId: baa.id, vendorId: vendor.id, code, email: vendor.contactEmail });
    console.log(`\n🔑 OTP CODE: ${code} (for ${vendor.contactEmail})\n`);

    // Send OTP via email (non-blocking — don't fail if SES is unavailable)
    try {
      await sendEmail({
        to: vendor.contactEmail,
        subject: `Your verification code: ${code}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #0F172A; font-size: 20px; margin-bottom: 8px;">Verification Code</h2>
            <p style="color: #64748B; font-size: 14px; margin-bottom: 24px;">
              Use the code below to verify your identity and access the Business Associate Agreement for signing.
            </p>
            <div style="background: #F1F5F9; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0F172A;">${code}</span>
            </div>
            <p style="color: #94A3B8; font-size: 12px;">
              This code expires in 10 minutes. Do not share it with anyone.<br/>
              If you did not request this, please ignore this email.
            </p>
          </div>
        `,
        text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes.`,
      });
    } catch (emailErr) {
      logger.warn("Failed to send OTP email (code still valid)", {
        baaId: baa.id,
        error: emailErr instanceof Error ? emailErr.message : String(emailErr),
      });
    }

    // Audit log
    await addAuditLog({
      baaId: baa.id,
      vendorId: vendor.id,
      action: "OTP_SENT",
      performedBy: vendor.contactEmail,
      details: { email: maskEmail(vendor.contactEmail) },
      ipAddress: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? null,
    });

    logger.info("OTP sent", { baaId: baa.id, email: maskEmail(vendor.contactEmail) });

    return NextResponse.json({
      success: true,
      email: maskEmail(vendor.contactEmail),
    });
  } catch (error) {
    logger.error("OTP send error", { baaId: id, error: String(error) });
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 },
    );
  }
}
