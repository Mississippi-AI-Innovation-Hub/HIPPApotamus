import { NextRequest, NextResponse } from "next/server";
import { getBAAById, updateBAA, addAuditLog, getVendorById } from "@/lib/db";
import { sendEmail } from "@/lib/email/sender";
import { adminNotificationEmail } from "@/lib/email/templates";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    let body: { vendorId?: string; reason?: string; notes?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body", code: "BAD_REQUEST" },
        { status: 400 },
      );
    }

    const existing = await getBAAById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "BAA not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    if (existing.status === "active" && existing.signedDate) {
      return NextResponse.json(
        { error: "BAA is already signed and cannot be declined", code: "ALREADY_SIGNED" },
        { status: 409 },
      );
    }

    if (existing.status === "declined") {
      return NextResponse.json(
        { error: "BAA has already been declined", code: "ALREADY_DECLINED" },
        { status: 409 },
      );
    }

    // Update BAA status to declined
    const baa = await updateBAA(id, {
      status: "declined",
    });

    if (!baa) {
      return NextResponse.json(
        { error: "Failed to decline BAA", code: "DECLINE_FAILED" },
        { status: 500 },
      );
    }

    // Audit log
    await addAuditLog({
      baaId: id,
      vendorId: existing.vendorId,
      action: "BAA declined",
      performedBy: body.vendorId ?? "anonymous",
      details: {
        reason: body.reason ?? "not_specified",
        notes: body.notes ?? "",
      },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    // Notify admin
    const vendor = await getVendorById(existing.vendorId);
    if (vendor) {
      const adminContent = adminNotificationEmail({
        vendorName: vendor.name,
        clinicName: "Central Mississippi Health District",
        baaId: id,
        action: "BAA Declined",
        performedBy: vendor.contactName,
        timestamp: new Date().toISOString(),
      });

      const adminEmail = process.env.ADMIN_EMAIL ?? "admin@msdoh.ms.gov";
      await sendEmail({
        to: adminEmail,
        ...adminContent,
      });
    }

    logger.info("BAA declined", {
      baaId: id,
      vendorId: existing.vendorId,
      reason: body.reason,
    });

    return NextResponse.json({ baa });
  } catch (error) {
    logger.error("POST /api/baas/[id]/decline failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to decline BAA", code: "DECLINE_BAA_ERROR" },
      { status: 500 },
    );
  }
}
