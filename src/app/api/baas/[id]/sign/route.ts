import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import { getBAAById, signBAA, addAuditLog, getVendorById } from "@/lib/db";
import { sendEmail } from "@/lib/email/sender";
import { signedConfirmationEmail, adminNotificationEmail } from "@/lib/email/templates";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await getRequiredSession();
    const { id } = await context.params;

    const existing = await getBAAById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "BAA not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    if (existing.status === "active" && existing.signedDate) {
      return NextResponse.json(
        { error: "BAA is already signed", code: "ALREADY_SIGNED" },
        { status: 409 },
      );
    }

    const baa = await signBAA(id, session.name);
    if (!baa) {
      return NextResponse.json(
        { error: "Failed to sign BAA", code: "SIGN_FAILED" },
        { status: 500 },
      );
    }

    // Audit log
    await addAuditLog({
      baaId: id,
      vendorId: baa.vendorId,
      action: "BAA signed",
      performedBy: session.id,
      details: {
        signedBy: session.name,
        signedDate: baa.signedDate ?? "",
      },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    // Send confirmation email to vendor
    const vendor = await getVendorById(baa.vendorId);
    if (vendor) {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

      const confirmationContent = signedConfirmationEmail({
        vendorName: vendor.name,
        contactName: vendor.contactName,
        clinicName: "Mississippi DOH Central Region",
        baaId: id,
        signedDate: baa.signedDate ?? new Date().toISOString(),
        documentUrl: baa.documentUrl ?? `${baseUrl}/baas/${id}`,
      });

      await sendEmail({
        to: vendor.contactEmail,
        ...confirmationContent,
      });

      // Notify admin
      const adminContent = adminNotificationEmail({
        vendorName: vendor.name,
        clinicName: "Mississippi DOH Central Region",
        baaId: id,
        action: "BAA Signed",
        performedBy: session.name,
        timestamp: new Date().toISOString(),
      });

      const adminEmail =
        process.env.ADMIN_EMAIL ?? "admin@msdoh.ms.gov";
      await sendEmail({
        to: adminEmail,
        ...adminContent,
      });
    }

    return NextResponse.json({ baa });
  } catch (error) {
    logger.error("POST /api/baas/[id]/sign failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to sign BAA", code: "SIGN_BAA_ERROR" },
      { status: 500 },
    );
  }
}
