import { getRequiredSession } from "@/lib/auth/session";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { AuditLog, BAA, BAAStatus, Vendor } from "@/types";

// Force dynamic rendering — this page reads session headers
export const dynamic = "force-dynamic";

// ─── Metadata ───────────────────────────────────────────────────────────────

export const metadata = {
  title: "Dashboard | HIPAApotamus",
  description: "BAA management dashboard for Mississippi Department of Health",
};

// ─── Demo Data ──────────────────────────────────────────────────────────────
// TODO: Replace with real API calls in Milestone 7

function getDemoVendors(): Vendor[] {
  const now = new Date().toISOString();
  return [
    {
      id: "vendor-001",
      name: "CernerHealth Systems",
      type: "ehr_platform",
      contractType: "baa_ehr_platform_services",
      contactName: "Michael Torres",
      contactEmail: "m.torres@cernerhealth.com",
      contactPhone: "(601) 555-0142",
      address: "200 Health Park Drive, Jackson, MS 39216",
      requiresSubcontractorCompliance: true,
      requiresSoc2Report: true,
      breachNotificationSLADays: 10,
      createdAt: "2024-01-15T09:00:00Z",
      updatedAt: now,
    },
    {
      id: "vendor-002",
      name: "LabCorp Diagnostics",
      type: "reference_laboratory",
      contractType: "baa_reference_laboratory_services",
      contactName: "Angela Williams",
      contactEmail: "a.williams@labcorp.com",
      contactPhone: "(601) 555-0198",
      address: "500 Lab Center Blvd, Biloxi, MS 39531",
      requiresSubcontractorCompliance: false,
      requiresSoc2Report: true,
      breachNotificationSLADays: 60,
      createdAt: "2024-02-01T10:30:00Z",
      updatedAt: now,
    },
    {
      id: "vendor-003",
      name: "TeleDoc Health",
      type: "telehealth_platform",
      contractType: "baa_telehealth_remote_monitoring_services",
      contactName: "James Chen",
      contactEmail: "j.chen@teledochealth.com",
      contactPhone: "(601) 555-0176",
      address: "750 Digital Health Way, Hattiesburg, MS 39401",
      requiresSubcontractorCompliance: true,
      requiresSoc2Report: false,
      breachNotificationSLADays: 30,
      createdAt: "2024-03-10T14:00:00Z",
      updatedAt: now,
    },
    {
      id: "vendor-004",
      name: "RxBridge Solutions",
      type: "eprescribing_pmp",
      contractType: "baa_eprescribing_pmp_integration_services",
      contactName: "Patricia Davis",
      contactEmail: "p.davis@rxbridge.com",
      contactPhone: "(601) 555-0211",
      address: "300 Pharmacy Tech Pkwy, Gulfport, MS 39501",
      requiresSubcontractorCompliance: false,
      requiresSoc2Report: true,
      breachNotificationSLADays: 60,
      createdAt: "2024-04-05T11:00:00Z",
      updatedAt: now,
    },
    {
      id: "vendor-005",
      name: "DataVault Medical Archives",
      type: "medical_records_storage",
      contractType: "baa_medical_records_storage_roi_services",
      contactName: "Robert Kim",
      contactEmail: "r.kim@datavaultmed.com",
      contactPhone: "(601) 555-0189",
      address: "1200 Archive Center Dr, Meridian, MS 39301",
      requiresSubcontractorCompliance: true,
      requiresSoc2Report: true,
      breachNotificationSLADays: 60,
      createdAt: "2024-05-20T08:30:00Z",
      updatedAt: now,
    },
  ];
}

function getDemoBAAs(): BAA[] {
  // Helper to create dates relative to today
  const today = new Date();
  const daysFromNow = (d: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() + d);
    return date.toISOString().split("T")[0] + "T00:00:00Z";
  };
  const daysAgo = (d: number) => daysFromNow(-d);

  const statusForDays = (d: number): BAAStatus => {
    if (d < 0) return "expired";
    if (d <= 90) return "expiring_soon";
    return "active";
  };

  const baaData: {
    vendorId: string;
    contractType: BAA["contractType"];
    daysUntilExpiry: number;
    termYears: 1 | 2;
    templateVersion: string;
    retentionNotice: boolean;
    pending?: boolean;
  }[] = [
    {
      vendorId: "vendor-001",
      contractType: "baa_ehr_platform_services",
      daysUntilExpiry: 245,
      termYears: 2,
      templateVersion: "v2.1.0",
      retentionNotice: false,
    },
    {
      vendorId: "vendor-002",
      contractType: "baa_reference_laboratory_services",
      daysUntilExpiry: 45,
      termYears: 2,
      templateVersion: "v2.0.3",
      retentionNotice: false,
    },
    {
      vendorId: "vendor-003",
      contractType: "baa_telehealth_remote_monitoring_services",
      daysUntilExpiry: -15,
      termYears: 1,
      templateVersion: "v1.8.0",
      retentionNotice: false,
    },
    {
      vendorId: "vendor-004",
      contractType: "baa_eprescribing_pmp_integration_services",
      daysUntilExpiry: 12,
      termYears: 1,
      templateVersion: "v2.1.0",
      retentionNotice: false,
      pending: true,
    },
    {
      vendorId: "vendor-005",
      contractType: "baa_medical_records_storage_roi_services",
      daysUntilExpiry: 500,
      termYears: 2,
      templateVersion: "v2.1.0",
      retentionNotice: true,
    },
  ];

  return baaData.map((d, i) => ({
    id: `baa-${String(i + 1).padStart(3, "0")}`,
    vendorId: d.vendorId,
    clinicId: "clinic-001",
    contractType: d.contractType,
    status: d.pending ? "pending_signature" : statusForDays(d.daysUntilExpiry),
    effectiveDate: daysAgo(365 * d.termYears - d.daysUntilExpiry),
    expirationDate: daysFromNow(d.daysUntilExpiry),
    signedDate: d.pending ? null : daysAgo(365 * d.termYears - d.daysUntilExpiry + 5),
    signedBy: d.pending ? null : "Sarah Chen",
    documentUrl: d.pending ? null : `https://s3.us-east-1.amazonaws.com/hipaapotamus-docs/baa-${String(i + 1).padStart(3, "0")}.pdf`,
    templateVersion: d.templateVersion,
    termYears: d.termYears,
    requiresStateLawRetentionNotice: d.retentionNotice,
    createdAt: daysAgo(365 * d.termYears - d.daysUntilExpiry + 10),
    updatedAt: new Date().toISOString(),
  }));
}

function getDemoAuditLogs(): AuditLog[] {
  const today = new Date();
  const daysAgo = (d: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    return date.toISOString();
  };

  return [
    {
      id: "log-001",
      baaId: "baa-001",
      vendorId: "vendor-001",
      action: "BAA created",
      performedBy: "Sarah Chen",
      performedAt: daysAgo(365),
      details: { templateVersion: "v2.1.0" },
      ipAddress: "192.168.1.100",
    },
    {
      id: "log-002",
      baaId: "baa-001",
      vendorId: "vendor-001",
      action: "BAA sent to vendor",
      performedBy: "Sarah Chen",
      performedAt: daysAgo(360),
      details: { recipient: "m.torres@cernerhealth.com" },
      ipAddress: "192.168.1.100",
    },
    {
      id: "log-003",
      baaId: "baa-001",
      vendorId: "vendor-001",
      action: "BAA signed",
      performedBy: "Michael Torres",
      performedAt: daysAgo(355),
      details: { signatureMethod: "electronic" },
      ipAddress: "10.0.0.42",
    },
    {
      id: "log-004",
      baaId: "baa-002",
      vendorId: "vendor-002",
      action: "BAA created",
      performedBy: "Sarah Chen",
      performedAt: daysAgo(300),
      details: { templateVersion: "v2.0.3" },
      ipAddress: "192.168.1.100",
    },
    {
      id: "log-005",
      baaId: "baa-002",
      vendorId: "vendor-002",
      action: "BAA signed",
      performedBy: "Angela Williams",
      performedAt: daysAgo(290),
      details: { signatureMethod: "electronic" },
      ipAddress: "10.0.0.55",
    },
    {
      id: "log-006",
      baaId: "baa-002",
      vendorId: "vendor-002",
      action: "90-day expiration reminder sent",
      performedBy: "System",
      performedAt: daysAgo(45),
      details: { recipient: "a.williams@labcorp.com", channel: "email" },
      ipAddress: null,
    },
    {
      id: "log-007",
      baaId: "baa-003",
      vendorId: "vendor-003",
      action: "BAA expired",
      performedBy: "System",
      performedAt: daysAgo(15),
      details: { autoExpired: true },
      ipAddress: null,
    },
    {
      id: "log-008",
      baaId: "baa-004",
      vendorId: "vendor-004",
      action: "BAA created",
      performedBy: "Sarah Chen",
      performedAt: daysAgo(20),
      details: { templateVersion: "v2.1.0" },
      ipAddress: "192.168.1.100",
    },
    {
      id: "log-009",
      baaId: "baa-004",
      vendorId: "vendor-004",
      action: "Signing link sent",
      performedBy: "Sarah Chen",
      performedAt: daysAgo(18),
      details: { recipient: "p.davis@rxbridge.com" },
      ipAddress: "192.168.1.100",
    },
    {
      id: "log-010",
      baaId: "baa-005",
      vendorId: "vendor-005",
      action: "BAA signed",
      performedBy: "Robert Kim",
      performedAt: daysAgo(180),
      details: { signatureMethod: "electronic", retentionNoticeAccepted: true },
      ipAddress: "10.0.0.78",
    },
  ];
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default async function DashboardPage() {
  // Verify user is authenticated
  await getRequiredSession();

  // Fetch data (demo data for now)
  const vendors = getDemoVendors();
  const baas = getDemoBAAs();
  const auditLogs = getDemoAuditLogs();

  return (
    <DashboardShell
      vendors={vendors}
      baas={baas}
      auditLogs={auditLogs}
    />
  );
}
