import { getRequiredSession } from "@/lib/auth/session";
import { getRecentAuditLogs, getVendors } from "@/lib/db";
import HistoryPageClient from "@/components/dashboard/HistoryPageClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Activity History | HIPAApotamus",
  description: "Complete audit trail of all compliance actions",
};

export default async function HistoryPage() {
  const session = await getRequiredSession();

  const [auditLogs, vendors] = await Promise.all([
    getRecentAuditLogs(100),
    getVendors(session.entityId),
  ]);

  // Build a vendor name map for the client component
  const vendorMap: Record<string, string> = {};
  for (const vendor of vendors) {
    vendorMap[vendor.id] = vendor.name;
  }

  return (
    <div className="space-y-6 px-8 py-8">
      {/* Page Header */}
      <div>
        <h1
          className="text-[28px] font-bold tracking-tight text-foreground"
          style={{ fontFamily: "'Satoshi', sans-serif" }}
        >
          Activity History
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Complete audit trail of all compliance actions
        </p>
      </div>

      <HistoryPageClient
        logs={auditLogs}
        vendorMap={vendorMap}
      />
    </div>
  );
}
