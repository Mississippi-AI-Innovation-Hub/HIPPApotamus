import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import {
  getBAAs,
  getBAAsByStatus,
  getExpiringBAAs,
  getVendors,
  getRecentAuditLogs,
} from "@/lib/db";
import { logger } from "@/lib/logger";

interface DashboardStats {
  totalVendors: number;
  totalBAAs: number;
  activeBAAs: number;
  expiringSoonBAAs: number;
  expiredBAAs: number;
  pendingSignatureBAAs: number;
  expiringWithin30Days: number;
  recentActivity: number;
}

export async function GET() {
  try {
    const session = await getRequiredSession();
    const clinicId =
      session.role === "admin" ? session.entityId : "clinic-001";

    const [vendors, allBAAs, activeBAAs, expiringSoon, expired, pending, expiringWithin30, recentLogs] =
      await Promise.all([
        getVendors(clinicId),
        getBAAs(clinicId),
        getBAAsByStatus("active"),
        getBAAsByStatus("expiring_soon"),
        getBAAsByStatus("expired"),
        getBAAsByStatus("pending_signature"),
        getExpiringBAAs(30),
        getRecentAuditLogs(10),
      ]);

    const stats: DashboardStats = {
      totalVendors: vendors.length,
      totalBAAs: allBAAs.length,
      activeBAAs: activeBAAs.length,
      expiringSoonBAAs: expiringSoon.length,
      expiredBAAs: expired.length,
      pendingSignatureBAAs: pending.length,
      expiringWithin30Days: expiringWithin30.length,
      recentActivity: recentLogs.length,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    logger.error("GET /api/stats failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats", code: "FETCH_STATS_ERROR" },
      { status: 500 },
    );
  }
}
