import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import { getAuditLogsByBAA, getAuditLogsByVendor, getRecentAuditLogs } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    await getRequiredSession();
    const { searchParams } = new URL(request.url);
    const baaId = searchParams.get("baaId");
    const vendorId = searchParams.get("vendorId");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    if (baaId) {
      const logs = await getAuditLogsByBAA(baaId);
      return NextResponse.json({ logs });
    }

    if (vendorId) {
      const logs = await getAuditLogsByVendor(vendorId);
      return NextResponse.json({ logs });
    }

    const logs = await getRecentAuditLogs(limit);
    return NextResponse.json({ logs });
  } catch (error) {
    logger.error("GET /api/audit failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch audit logs", code: "FETCH_AUDIT_ERROR" },
      { status: 500 },
    );
  }
}
