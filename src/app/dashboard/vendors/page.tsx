import { getRequiredSession } from "@/lib/auth/session";
import { getVendors, getBAAs, getRecentAuditLogs } from "@/lib/db";
import VendorsPageClient from "@/components/dashboard/VendorsPageClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendors | HIPAApotamus",
  description: "Manage healthcare vendor relationships",
};

export default async function VendorsPage() {
  const session = await getRequiredSession();

  const [vendors, baas, auditLogs] = await Promise.all([
    getVendors(session.entityId),
    getBAAs(session.entityId),
    getRecentAuditLogs(50),
  ]);

  return (
    <div className="space-y-6">
      <VendorsPageClient
        vendors={vendors}
        baas={baas}
        auditLogs={auditLogs}
      />
    </div>
  );
}
