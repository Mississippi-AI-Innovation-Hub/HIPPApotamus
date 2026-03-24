import { getRequiredSession } from "@/lib/auth/session";
import { getVendors, getBAAs, getRecentAuditLogs, getExpiringBAAs } from "@/lib/db";
import type { BAA, AuditLog, Vendor } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatsRow from "@/components/dashboard/StatsRow";
import StatusChart from "@/components/dashboard/StatusChart";
import ExpirationTimeline from "@/components/dashboard/ExpirationTimeline";
import UrgentReminders from "@/components/dashboard/UrgentReminders";
import type { UrgentItem } from "@/components/dashboard/UrgentReminders";
import RecentActivity from "@/components/dashboard/RecentActivity";
import type { ActivityEntry } from "@/components/dashboard/RecentActivity";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard | HIPAApotamus",
  description: "BAA management dashboard for Mississippi Department of Health",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Build the 6-month expiration bucket data for the timeline chart. */
function buildExpirationBuckets(baas: BAA[]) {
  const now = new Date();
  const buckets: { label: string; count: number; monthOffset: number }[] = [];

  for (let i = 0; i < 6; i++) {
    const target = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 0);
    const label = target.toLocaleDateString("en-US", { month: "short", year: undefined });

    const count = baas.filter((b) => {
      if (!b.expirationDate) return false;
      const exp = new Date(b.expirationDate);
      // For the current month (i=0), only count from today forward
      const start = i === 0 ? now : target;
      return exp >= start && exp <= monthEnd;
    }).length;

    buckets.push({ label, count, monthOffset: i });
  }

  return buckets;
}

/** Build the urgent reminders list from BAA + vendor data. */
function buildUrgentItems(baas: BAA[], vendors: Vendor[]): UrgentItem[] {
  const now = new Date();
  const vendorMap = new Map(vendors.map((v) => [v.id, v]));
  const items: UrgentItem[] = [];

  for (const baa of baas) {
    const vendor = vendorMap.get(baa.vendorId);
    const vendorName = vendor?.name ?? "Unknown Vendor";

    if (baa.status === "expired") {
      items.push({
        baaId: baa.id,
        vendorName,
        type: "expired",
      });
    } else if (baa.status === "expiring_soon" && baa.expirationDate) {
      const exp = new Date(baa.expirationDate);
      const daysLeft = Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      if (daysLeft <= 30) {
        items.push({
          baaId: baa.id,
          vendorName,
          type: "expiring",
          daysLeft,
        });
      }
    } else if (baa.status === "pending_signature") {
      items.push({
        baaId: baa.id,
        vendorName,
        type: "pending",
      });
    }
  }

  // Sort: expired first, then by days left ascending, then pending
  items.sort((a, b) => {
    const order = { expired: 0, expiring: 1, pending: 2 };
    if (order[a.type] !== order[b.type]) return order[a.type] - order[b.type];
    if (a.type === "expiring" && b.type === "expiring") {
      return (a.daysLeft ?? 0) - (b.daysLeft ?? 0);
    }
    return 0;
  });

  return items;
}

/** Classify an audit log action string into an action type for the UI. */
function classifyAuditAction(
  action: string
): ActivityEntry["actionType"] {
  const lower = action.toLowerCase();
  if (lower.includes("created") || lower.includes("new baa")) return "BAA_CREATED";
  if (lower.includes("signed") || lower.includes("executed")) return "BAA_SIGNED";
  if (lower.includes("reminder") || lower.includes("notif")) return "REMINDER_SENT";
  if (lower.includes("expired") || lower.includes("expiration")) return "BAA_EXPIRED";
  if (lower.includes("link") || lower.includes("opened")) return "SIGNING_LINK_OPENED";
  return "OTHER";
}

/** Map AuditLog records to the ActivityEntry shape needed by the client component. */
function buildActivityEntries(logs: AuditLog[]): ActivityEntry[] {
  return logs.slice(0, 10).map((log) => ({
    id: log.id,
    baaId: log.baaId,
    action: log.action,
    performedBy: log.performedBy,
    performedAt: log.performedAt,
    actionType: classifyAuditAction(log.action),
  }));
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getRequiredSession();

  const [vendors, baas, auditLogs] = await Promise.all([
    getVendors(session.entityId),
    getBAAs(session.entityId),
    getRecentAuditLogs(10),
  ]);

  // Stats
  const totalVendors = vendors.length;
  const activeBAAs = baas.filter((b) => b.status === "active").length;
  const expiringSoon = baas.filter((b) => b.status === "expiring_soon").length;
  const expired = baas.filter(
    (b) => b.status === "expired" || b.status === "pending_signature"
  ).length;

  // Chart data
  const statusCounts = {
    active: activeBAAs,
    expiringSoon,
    expired: baas.filter((b) => b.status === "expired").length,
    pending: baas.filter((b) => b.status === "pending_signature").length,
  };

  const expirationBuckets = buildExpirationBuckets(baas);
  const urgentItems = buildUrgentItems(baas, vendors);
  const activityEntries = buildActivityEntries(auditLogs);

  return (
    <div className="space-y-8 px-8 py-8">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div>
        <h1
          className="text-[28px] font-bold tracking-tight text-foreground"
          style={{ fontFamily: "'Satoshi', sans-serif" }}
        >
          Dashboard Overview
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          HIPAA Compliance &mdash; Business Associate Agreements
        </p>
      </div>

      {/* ── Stats Row ───────────────────────────────────────────────── */}
      <StatsRow
        totalVendors={totalVendors}
        activeBAAs={activeBAAs}
        expiringSoon={expiringSoon}
        expired={expired}
      />

      {/* ── Charts Section ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* BAA Status Distribution */}
        <Card className="shadow-premium">
          <CardHeader>
            <CardTitle
              className="text-base font-bold"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              BAA Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusChart
              active={statusCounts.active}
              expiringSoon={statusCounts.expiringSoon}
              expired={statusCounts.expired}
              pending={statusCounts.pending}
            />
          </CardContent>
        </Card>

        {/* Expiration Timeline */}
        <Card className="shadow-premium">
          <CardHeader>
            <CardTitle
              className="text-base font-bold"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              Expiration Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ExpirationTimeline buckets={expirationBuckets} />
          </CardContent>
        </Card>
      </div>

      {/* ── Urgent Reminders + Recent Activity ──────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Urgent Reminders */}
        <Card className="shadow-premium">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: "#FEE2E2" }}>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  style={{ color: "#B91C1C" }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                  />
                </svg>
              </div>
              <CardTitle
                className="text-base font-bold"
                style={{ fontFamily: "'Satoshi', sans-serif" }}
              >
                Urgent Reminders
              </CardTitle>
              {urgentItems.length > 0 && (
                <span className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-white">
                  {urgentItems.length}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <UrgentReminders items={urgentItems} />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="shadow-premium">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: "#DBEAFE" }}>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  style={{ color: "#1D4ED8" }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              </div>
              <CardTitle
                className="text-base font-bold"
                style={{ fontFamily: "'Satoshi', sans-serif" }}
              >
                Recent Activity
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <RecentActivity entries={activityEntries} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
