/**
 * In-memory data store for local development.
 * Used when DYNAMODB_TABLE_NAME is not set.
 * Pre-seeded with Mississippi DOH demo data.
 */
import type { Vendor, BAA, AuditLog, Clinic, BAAStatus, SigningCertificate, SignedSnapshot } from "@/types";
import { logger } from "@/lib/logger";
import crypto from "node:crypto";

// ─── Seed data ──────────────────────────────────────────────────────────────

const CLINIC: Clinic = {
  id: "clinic-mdh-001",
  name: "Mississippi Department of Health — Central Region",
  address: "570 East Woodrow Wilson Ave, Jackson, MS 39216",
  contactName: "Dr. Sarah Mitchell",
  contactEmail: "bipuladk60@gmail.com",
  hipaaOfficer: "James Tran, J.D.",
  npi: "1234567890",
};

const now = new Date().toISOString();

const VENDORS: Vendor[] = [
  {
    id: "vendor-001",
    name: "CareCloud EHR Systems",
    type: "ehr_platform",
    contractType: "baa_ehr_platform_services",
    contactName: "Jennifer Walsh",
    contactEmail: "j.walsh@carecloud.dev",
    contactPhone: "(601) 555-0101",
    authorizedSignerTitle: "Chief Privacy Officer",
    address: "100 Innovation Dr, Jackson, MS 39201",
    requiresSubcontractorCompliance: true,
    requiresSoc2Report: true,
    breachNotificationSLADays: 10,
    createdAt: "2024-01-10T08:00:00.000Z",
    updatedAt: now,
  },
  {
    id: "vendor-002",
    name: "MedBridge Lab Solutions",
    type: "reference_laboratory",
    contractType: "baa_reference_laboratory_services",
    contactName: "Robert Chen",
    contactEmail: "r.chen@medbridge.dev",
    contactPhone: "(601) 555-0102",
    authorizedSignerTitle: "Director of Laboratory Operations",
    address: "200 Lab Parkway, Hattiesburg, MS 39401",
    requiresSubcontractorCompliance: false,
    requiresSoc2Report: true,
    breachNotificationSLADays: 60,
    createdAt: "2023-05-20T08:00:00.000Z",
    updatedAt: now,
  },
  {
    id: "vendor-003",
    name: "TeleHealth Connect MS",
    type: "telehealth_platform",
    contractType: "baa_telehealth_remote_monitoring_services",
    contactName: "Maria Santos",
    contactEmail: "m.santos@thconnect.dev",
    contactPhone: "(601) 555-0103",
    authorizedSignerTitle: "VP of Compliance",
    address: "300 Telecom Blvd, Biloxi, MS 39531",
    requiresSubcontractorCompliance: true,
    requiresSoc2Report: false,
    breachNotificationSLADays: 30,
    createdAt: "2022-02-15T08:00:00.000Z",
    updatedAt: now,
  },
  {
    id: "vendor-004",
    name: "SecureRx Pharmacy Network",
    type: "eprescribing_pmp",
    contractType: "baa_eprescribing_pmp_integration_services",
    contactName: "David Kim",
    contactEmail: "d.kim@securerx.dev",
    contactPhone: "(601) 555-0104",
    authorizedSignerTitle: "Pharmacy Compliance Manager",
    address: "400 Pharmacy Row, Gulfport, MS 39501",
    requiresSubcontractorCompliance: false,
    requiresSoc2Report: false,
    breachNotificationSLADays: 60,
    createdAt: "2024-09-01T08:00:00.000Z",
    updatedAt: now,
  },
  {
    id: "vendor-005",
    name: "DataVault Health Records",
    type: "medical_records_storage",
    contractType: "baa_medical_records_storage_roi_services",
    contactName: "Angela Thompson",
    contactEmail: "a.thompson@datavault.dev",
    contactPhone: "(601) 555-0105",
    authorizedSignerTitle: "Director of Records Management",
    address: "500 Storage Ave, Tupelo, MS 38801",
    requiresSubcontractorCompliance: true,
    requiresSoc2Report: true,
    breachNotificationSLADays: 30,
    createdAt: "2024-06-15T08:00:00.000Z",
    updatedAt: now,
  },
];

const BAAS: BAA[] = [
  {
    id: "baa-001",
    vendorId: "vendor-001",
    clinicId: "clinic-mdh-001",
    contractType: "baa_ehr_platform_services",
    status: "active",
    effectiveDate: "2024-01-15",
    expirationDate: "2026-01-15",
    signedDate: "2024-01-15T14:30:00.000Z",
    signedBy: "j.walsh@carecloud.dev",
    documentUrl: "",
    signedDocumentUrl: null,
    signingCertificate: null,
    signedSnapshot: null,
    documentVersion: 1,
    parentBaaId: null,
    versionType: "original",
    signedDocumentHash: null,
    counterSignedDate: "2024-01-15T16:00:00.000Z",
    counterSignedBy: "James Tran",
    counterSignerTitle: "HIPAA Privacy Officer",
    terminationDate: null,
    terminationReason: null,
    terminationNotes: null,
    terminatedBy: null,
    templateVersion: "2025.1",
    termYears: 2,
    requiresStateLawRetentionNotice: true,
    createdAt: "2024-01-10T08:00:00.000Z",
    updatedAt: now,
  },
  {
    id: "baa-002",
    vendorId: "vendor-002",
    clinicId: "clinic-mdh-001",
    contractType: "baa_reference_laboratory_services",
    status: "expiring_soon",
    effectiveDate: "2023-06-01",
    expirationDate: "2025-06-01",
    signedDate: "2023-06-01T10:00:00.000Z",
    signedBy: "r.chen@medbridge.dev",
    documentUrl: "",
    signedDocumentUrl: null,
    signingCertificate: null,
    signedSnapshot: null,
    documentVersion: 1,
    parentBaaId: null,
    versionType: "original",
    signedDocumentHash: null,
    counterSignedDate: "2023-06-01T14:00:00.000Z",
    counterSignedBy: "James Tran",
    counterSignerTitle: "HIPAA Privacy Officer",
    terminationDate: null,
    terminationReason: null,
    terminationNotes: null,
    terminatedBy: null,
    templateVersion: "2025.1",
    termYears: 2,
    requiresStateLawRetentionNotice: false,
    createdAt: "2023-05-20T08:00:00.000Z",
    updatedAt: now,
  },
  {
    id: "baa-003",
    vendorId: "vendor-003",
    clinicId: "clinic-mdh-001",
    contractType: "baa_telehealth_remote_monitoring_services",
    status: "expired",
    effectiveDate: "2022-03-01",
    expirationDate: "2024-03-01",
    signedDate: "2022-03-01T09:00:00.000Z",
    signedBy: "m.santos@thconnect.dev",
    documentUrl: "",
    signedDocumentUrl: null,
    signingCertificate: null,
    signedSnapshot: null,
    documentVersion: 1,
    parentBaaId: null,
    versionType: "original",
    signedDocumentHash: null,
    counterSignedDate: "2022-03-01T12:00:00.000Z",
    counterSignedBy: "James Tran",
    counterSignerTitle: "HIPAA Privacy Officer",
    terminationDate: null,
    terminationReason: null,
    terminationNotes: null,
    terminatedBy: null,
    templateVersion: "2025.1",
    termYears: 2,
    requiresStateLawRetentionNotice: true,
    createdAt: "2022-02-15T08:00:00.000Z",
    updatedAt: now,
  },
  {
    id: "baa-004",
    vendorId: "vendor-004",
    clinicId: "clinic-mdh-001",
    contractType: "baa_eprescribing_pmp_integration_services",
    status: "pending_signature",
    effectiveDate: "2025-01-01",
    expirationDate: "2027-01-01",
    signedDate: null,
    signedBy: null,
    documentUrl: "",
    signedDocumentUrl: null,
    signingCertificate: null,
    signedSnapshot: null,
    documentVersion: 1,
    parentBaaId: null,
    versionType: "original",
    signedDocumentHash: null,
    counterSignedDate: null,
    counterSignedBy: null,
    counterSignerTitle: null,
    terminationDate: null,
    terminationReason: null,
    terminationNotes: null,
    terminatedBy: null,
    templateVersion: "2025.1",
    termYears: 2,
    requiresStateLawRetentionNotice: false,
    createdAt: "2024-09-01T08:00:00.000Z",
    updatedAt: now,
  },
  {
    id: "baa-005",
    vendorId: "vendor-005",
    clinicId: "clinic-mdh-001",
    contractType: "baa_medical_records_storage_roi_services",
    status: "pending_countersignature",
    effectiveDate: "2024-07-01",
    expirationDate: "2026-07-01",
    signedDate: "2024-07-01T11:00:00.000Z",
    signedBy: "a.thompson@datavault.dev",
    documentUrl: "",
    signedDocumentUrl: null,
    signingCertificate: null,
    signedSnapshot: null,
    documentVersion: 1,
    parentBaaId: null,
    versionType: "original",
    signedDocumentHash: null,
    counterSignedDate: null,
    counterSignedBy: null,
    counterSignerTitle: null,
    terminationDate: null,
    terminationReason: null,
    terminationNotes: null,
    terminatedBy: null,
    templateVersion: "2025.1",
    termYears: 2,
    requiresStateLawRetentionNotice: true,
    createdAt: "2024-06-15T08:00:00.000Z",
    updatedAt: now,
  },
];

const AUDIT_LOGS: AuditLog[] = [
  // CareCloud BAA
  { id: "log-001", baaId: "baa-001", vendorId: "vendor-001", action: "BAA_CREATED", performedBy: "admin@msdh.ms.gov", performedAt: "2024-01-10T08:00:00.000Z", details: { message: "BAA created and sent to vendor" }, ipAddress: "10.0.0.1" },
  { id: "log-002", baaId: "baa-001", vendorId: "vendor-001", action: "SIGNING_LINK_OPENED", performedBy: "j.walsh@carecloud.dev", performedAt: "2024-01-14T09:30:00.000Z", details: { message: "Vendor opened signing link" }, ipAddress: "72.14.0.1" },
  { id: "log-003", baaId: "baa-001", vendorId: "vendor-001", action: "BAA_SIGNED", performedBy: "j.walsh@carecloud.dev", performedAt: "2024-01-15T14:30:00.000Z", details: { message: "Contract signed electronically" }, ipAddress: "72.14.0.1" },
  // MedBridge BAA
  { id: "log-004", baaId: "baa-002", vendorId: "vendor-002", action: "BAA_CREATED", performedBy: "admin@msdh.ms.gov", performedAt: "2023-05-20T08:00:00.000Z", details: { message: "BAA created and sent to vendor" }, ipAddress: "10.0.0.1" },
  { id: "log-005", baaId: "baa-002", vendorId: "vendor-002", action: "BAA_SIGNED", performedBy: "r.chen@medbridge.dev", performedAt: "2023-06-01T10:00:00.000Z", details: { message: "Contract signed electronically" }, ipAddress: "96.45.0.2" },
  { id: "log-006", baaId: "baa-002", vendorId: "vendor-002", action: "REMINDER_SENT", performedBy: "system", performedAt: "2025-03-01T00:00:00.000Z", details: { message: "Expiration reminder sent (90 days)" }, ipAddress: "10.0.0.1" },
  // TeleHealth BAA
  { id: "log-007", baaId: "baa-003", vendorId: "vendor-003", action: "BAA_CREATED", performedBy: "admin@msdh.ms.gov", performedAt: "2022-02-15T08:00:00.000Z", details: { message: "BAA created and sent to vendor" }, ipAddress: "10.0.0.1" },
  { id: "log-008", baaId: "baa-003", vendorId: "vendor-003", action: "BAA_SIGNED", performedBy: "m.santos@thconnect.dev", performedAt: "2022-03-01T09:00:00.000Z", details: { message: "Contract signed electronically" }, ipAddress: "104.28.0.3" },
  { id: "log-009", baaId: "baa-003", vendorId: "vendor-003", action: "BAA_EXPIRED", performedBy: "system", performedAt: "2024-03-01T00:00:00.000Z", details: { message: "Contract expired" }, ipAddress: "10.0.0.1" },
  // SecureRx BAA
  { id: "log-010", baaId: "baa-004", vendorId: "vendor-004", action: "BAA_CREATED", performedBy: "admin@msdh.ms.gov", performedAt: "2024-09-01T08:00:00.000Z", details: { message: "BAA created and sent to vendor" }, ipAddress: "10.0.0.1" },
  { id: "log-011", baaId: "baa-004", vendorId: "vendor-004", action: "SIGNING_LINK_OPENED", performedBy: "d.kim@securerx.dev", performedAt: "2024-09-05T14:00:00.000Z", details: { message: "Vendor opened signing link" }, ipAddress: "67.90.0.4" },
  { id: "log-012", baaId: "baa-004", vendorId: "vendor-004", action: "REMINDER_SENT", performedBy: "system", performedAt: "2025-02-01T00:00:00.000Z", details: { message: "Signature reminder sent" }, ipAddress: "10.0.0.1" },
  // DataVault BAA
  { id: "log-013", baaId: "baa-005", vendorId: "vendor-005", action: "BAA_CREATED", performedBy: "admin@msdh.ms.gov", performedAt: "2024-06-15T08:00:00.000Z", details: { message: "BAA created and sent to vendor" }, ipAddress: "10.0.0.1" },
  { id: "log-014", baaId: "baa-005", vendorId: "vendor-005", action: "BAA_SIGNED", performedBy: "a.thompson@datavault.dev", performedAt: "2024-07-01T11:00:00.000Z", details: { message: "Contract signed electronically" }, ipAddress: "209.85.0.5" },
  { id: "log-015", baaId: "baa-005", vendorId: "vendor-005", action: "AUDIT_PACKET_GENERATED", performedBy: "admin@msdh.ms.gov", performedAt: "2025-01-15T16:00:00.000Z", details: { message: "Annual audit packet generated" }, ipAddress: "10.0.0.1" },
];

// ─── Mutable in-memory store ────────────────────────────────────────────────

const store = {
  clinics: new Map<string, Clinic>([[CLINIC.id, CLINIC]]),
  vendors: new Map<string, Vendor>(VENDORS.map((v) => [v.id, v])),
  baas: new Map<string, BAA>(BAAS.map((b) => [b.id, b])),
  auditLogs: [...AUDIT_LOGS],
};

// ─── Vendor operations ──────────────────────────────────────────────────────

export async function getVendors(_clinicId: string): Promise<Vendor[]> {
  return Array.from(store.vendors.values());
}

export async function getVendorById(id: string): Promise<Vendor | null> {
  return store.vendors.get(id) ?? null;
}

export async function createVendor(
  data: Omit<Vendor, "id" | "createdAt" | "updatedAt">,
  _clinicId: string,
): Promise<Vendor> {
  const id = crypto.randomUUID();
  const ts = new Date().toISOString();
  const vendor: Vendor = { ...data, id, createdAt: ts, updatedAt: ts };
  store.vendors.set(id, vendor);
  logger.info("[mem] Vendor created", { id, name: vendor.name });
  return vendor;
}

export async function updateVendor(
  id: string,
  updates: Partial<Omit<Vendor, "id" | "createdAt">>,
): Promise<Vendor | null> {
  const existing = store.vendors.get(id);
  if (!existing) return null;
  const updated: Vendor = { ...existing, ...updates, id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
  store.vendors.set(id, updated);
  return updated;
}

export async function deleteVendor(id: string): Promise<boolean> {
  return store.vendors.delete(id);
}

// ─── BAA operations ─────────────────────────────────────────────────────────

export async function getBAAs(_clinicId: string): Promise<BAA[]> {
  return Array.from(store.baas.values());
}

export async function getBAAById(id: string): Promise<BAA | null> {
  return store.baas.get(id) ?? null;
}

export async function getBAAsByStatus(status: BAAStatus): Promise<BAA[]> {
  return Array.from(store.baas.values()).filter((b) => b.status === status);
}

export async function getBAAsByVendor(vendorId: string): Promise<BAA[]> {
  return Array.from(store.baas.values()).filter((b) => b.vendorId === vendorId);
}

export async function getExpiringBAAs(daysThreshold: number): Promise<BAA[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysThreshold);
  return Array.from(store.baas.values()).filter((b) => {
    const exp = new Date(b.expirationDate);
    return exp <= cutoff && exp >= new Date() && b.status !== "expired";
  });
}

export async function createBAA(
  data: Omit<BAA, "id" | "createdAt" | "updatedAt">,
): Promise<BAA> {
  const id = crypto.randomUUID();
  const ts = new Date().toISOString();
  const baa: BAA = { ...data, id, createdAt: ts, updatedAt: ts };
  store.baas.set(id, baa);
  logger.info("[mem] BAA created", { id, vendorId: baa.vendorId });
  return baa;
}

export async function updateBAA(
  id: string,
  updates: Partial<Omit<BAA, "id" | "createdAt">>,
): Promise<BAA | null> {
  const existing = store.baas.get(id);
  if (!existing) return null;
  const updated: BAA = { ...existing, ...updates, id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
  store.baas.set(id, updated);
  return updated;
}

export async function signBAA(
  id: string,
  signedBy: string,
  extra?: {
    signedDocumentUrl?: string | null;
    signingCertificate?: SigningCertificate | null;
    signedSnapshot?: SignedSnapshot | null;
  },
): Promise<BAA | null> {
  const existing = store.baas.get(id);
  if (!existing) return null;
  const signed: BAA = {
    ...existing,
    status: "pending_countersignature",
    signedDate: new Date().toISOString(),
    signedBy,
    ...(extra?.signedDocumentUrl !== undefined && { signedDocumentUrl: extra.signedDocumentUrl }),
    ...(extra?.signingCertificate !== undefined && { signingCertificate: extra.signingCertificate }),
    ...(extra?.signedSnapshot !== undefined && { signedSnapshot: extra.signedSnapshot }),
    updatedAt: new Date().toISOString(),
  };
  store.baas.set(id, signed);
  logger.info("[mem] BAA signed", { id, signedBy });
  return signed;
}

export async function deleteBAA(id: string): Promise<boolean> {
  return store.baas.delete(id);
}

// ─── Audit log operations ───────────────────────────────────────────────────

export async function addAuditLog(
  data: Omit<AuditLog, "id" | "performedAt">,
): Promise<AuditLog> {
  const log: AuditLog = {
    ...data,
    id: crypto.randomUUID(),
    performedAt: new Date().toISOString(),
  };
  store.auditLogs.push(log);
  return log;
}

export async function getAuditLogsByBAA(baaId: string): Promise<AuditLog[]> {
  return store.auditLogs
    .filter((l) => l.baaId === baaId)
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt));
}

export async function getAuditLogsByVendor(vendorId: string): Promise<AuditLog[]> {
  return store.auditLogs
    .filter((l) => l.vendorId === vendorId)
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt));
}

export async function getRecentAuditLogs(limit: number): Promise<AuditLog[]> {
  return store.auditLogs
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt))
    .slice(0, limit);
}

// ─── Clinic operations ──────────────────────────────────────────────────────

export async function getClinic(id: string): Promise<Clinic | null> {
  return store.clinics.get(id) ?? null;
}

export async function updateClinic(
  id: string,
  updates: Partial<Omit<Clinic, "id">>,
): Promise<Clinic | null> {
  const existing = store.clinics.get(id);
  if (!existing) return null;
  const updated: Clinic = { ...existing, ...updates, id };
  store.clinics.set(id, updated);
  return updated;
}
