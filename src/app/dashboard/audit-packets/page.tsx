import { getRequiredSession } from "@/lib/auth/session";
import {
  getVendors,
  getBAAs,
  getRecentAuditLogs,
  getAuditPackets,
} from "@/lib/db";
import AuditPacketsPageClient from "@/components/dashboard/AuditPacketsPageClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Audit Packets | HIPAApotamus",
  description:
    "Generate and manage HIPAA compliance documentation packets for Mississippi Department of Health",
};

export default async function AuditPacketsPage() {
  const session = await getRequiredSession();

  const [vendors, baas, auditLogs, packets] = await Promise.all([
    getVendors(session.entityId),
    getBAAs(session.entityId),
    getRecentAuditLogs(200),
    getAuditPackets(session.entityId),
  ]);

  return (
    <AuditPacketsPageClient
      vendors={vendors}
      baas={baas}
      auditLogs={auditLogs}
      initialPackets={packets}
    />
  );
}
