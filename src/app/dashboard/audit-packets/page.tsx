import { getRequiredSession } from "@/lib/auth/session";
import { getVendors, getBAAs, getRecentAuditLogs } from "@/lib/db";
import AuditPacketsPageClient from "@/components/dashboard/AuditPacketsPageClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Audit Packets | HIPAApotamus",
  description:
    "Generate and manage HIPAA compliance documentation packets for Mississippi Department of Health",
};

export default async function AuditPacketsPage() {
  const session = await getRequiredSession();

  const [vendors, baas, auditLogs] = await Promise.all([
    getVendors(session.entityId),
    getBAAs(session.entityId),
    getRecentAuditLogs(200),
  ]);

  return (
    <AuditPacketsPageClient
      vendors={vendors}
      baas={baas}
      auditLogs={auditLogs}
    />
  );
}
