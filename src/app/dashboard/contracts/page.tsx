import { getRequiredSession } from "@/lib/auth/session";
import { getVendors, getBAAs, getRecentAuditLogs } from "@/lib/db";
import ContractsPageClient from "@/components/dashboard/ContractsPageClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Contracts | HIPAApotamus",
  description: "Manage all Business Associate Agreements",
};

export default async function ContractsPage() {
  const session = await getRequiredSession();

  const [vendors, baas, auditLogs] = await Promise.all([
    getVendors(session.entityId),
    getBAAs(session.entityId),
    getRecentAuditLogs(50),
  ]);

  return (
    <div className="space-y-6">
      <ContractsPageClient
        vendors={vendors}
        baas={baas}
        auditLogs={auditLogs}
      />
    </div>
  );
}
