import { getRequiredSession } from "@/lib/auth/session";
import { getVendors, getBAAs, getRecentAuditLogs } from "@/lib/db";
import DashboardShell from "@/components/dashboard/DashboardShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard | HIPAApotamus",
  description: "BAA management dashboard for Mississippi Department of Health",
};

export default async function DashboardPage() {
  const session = await getRequiredSession();

  const [vendors, baas, auditLogs] = await Promise.all([
    getVendors(session.entityId),
    getBAAs(session.entityId),
    getRecentAuditLogs(50),
  ]);

  return (
    <DashboardShell
      vendors={vendors}
      baas={baas}
      auditLogs={auditLogs}
      userName={session.name}
      userRole={session.role}
      userEmail={session.email}
    />
  );
}
