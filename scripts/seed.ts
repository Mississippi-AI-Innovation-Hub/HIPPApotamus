/**
 * Seed script for HIPAApotamus demo data.
 *
 * Usage:
 *   npx tsx scripts/seed.ts          # Seed (skip existing)
 *   npx tsx scripts/seed.ts --reset  # Delete all then seed fresh
 */

import { PutCommand, ScanCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME } from "../src/lib/db/client";
import type {
  VendorType,
  ContractType,
  BAAStatus,
} from "../src/types";

const CLINIC_ID = "clinic-mdh-001";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function deleteAllRecords(): Promise<void> {
  /* eslint-disable no-console */
  console.log("Deleting all records...");

  let lastKey: Record<string, unknown> | undefined;
  let totalDeleted = 0;

  do {
    const scan = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        ProjectionExpression: "PK, SK",
        ExclusiveStartKey: lastKey,
      }),
    );

    const items = scan.Items ?? [];
    lastKey = scan.LastEvaluatedKey as Record<string, unknown> | undefined;

    if (items.length === 0) continue;

    // BatchWrite supports max 25 items
    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25);
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: batch.map((item) => ({
              DeleteRequest: {
                Key: { PK: item["PK"], SK: item["SK"] },
              },
            })),
          },
        }),
      );
      totalDeleted += batch.length;
    }
  } while (lastKey);

  console.log(`Deleted ${totalDeleted} records.`);
  /* eslint-enable no-console */
}

async function putItem(item: Record<string, unknown>): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }),
  );
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

interface VendorSeed {
  id: string;
  name: string;
  type: VendorType;
  contractType: ContractType;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  requiresSubcontractorCompliance: boolean;
  requiresSoc2Report: boolean;
  breachNotificationSLADays: number;
}

interface BAASeed {
  id: string;
  vendorId: string;
  status: BAAStatus;
  effectiveDate: string;
  expirationDate: string;
  signedDate: string | null;
  signedBy: string | null;
  termYears: 1 | 2;
  requiresStateLawRetentionNotice: boolean;
  contractType: ContractType;
  signedDocumentUrl?: string | null;
  signingCertificate?: unknown;
  signedSnapshot?: unknown;
  documentVersion?: number;
  parentBaaId?: string | null;
  versionType?: 'original' | 'amendment' | 'renewal' | 'extension';
}

const now = new Date().toISOString();

const vendors: VendorSeed[] = [
  // ── EHR Platforms ──
  { id: "vendor-001", name: "Pinnacle Health Systems", type: "ehr_platform", contractType: "baa_ehr_platform_services", contactName: "Dr. Rebecca Torres", contactEmail: "bipuladk60+v01@gmail.com", contactPhone: "(601) 445-8801", address: "2200 Magnolia Park Dr, Suite 400, Jackson, MS 39211", requiresSubcontractorCompliance: true, requiresSoc2Report: true, breachNotificationSLADays: 10 },
  { id: "vendor-002", name: "Horizon Medical Technologies", type: "ehr_platform", contractType: "baa_ehr_platform_services", contactName: "Marcus Webb", contactEmail: "bipuladk60+v02@gmail.com", contactPhone: "(601) 445-8802", address: "1500 River Bend Blvd, Ridgeland, MS 39157", requiresSubcontractorCompliance: true, requiresSoc2Report: true, breachNotificationSLADays: 10 },
  // ── Reference Laboratories ──
  { id: "vendor-003", name: "Clearwater Diagnostics", type: "reference_laboratory", contractType: "baa_reference_laboratory_services", contactName: "Dr. Angela Park", contactEmail: "bipuladk60+v03@gmail.com", contactPhone: "(228) 392-1100", address: "875 Gulf Coast Research Way, Biloxi, MS 39530", requiresSubcontractorCompliance: false, requiresSoc2Report: true, breachNotificationSLADays: 60 },
  { id: "vendor-004", name: "Southern Path Labs", type: "reference_laboratory", contractType: "baa_reference_laboratory_services", contactName: "James Whitfield", contactEmail: "bipuladk60+v04@gmail.com", contactPhone: "(601) 261-5500", address: "310 Hardy St, Suite 200, Hattiesburg, MS 39401", requiresSubcontractorCompliance: false, requiresSoc2Report: true, breachNotificationSLADays: 30 },
  // ── Telehealth Platforms ──
  { id: "vendor-005", name: "VirtualCare Mississippi", type: "telehealth_platform", contractType: "baa_telehealth_remote_monitoring_services", contactName: "Priya Desai", contactEmail: "bipuladk60+v05@gmail.com", contactPhone: "(601) 898-3300", address: "4400 Innovation Hub, Suite 12, Jackson, MS 39201", requiresSubcontractorCompliance: true, requiresSoc2Report: false, breachNotificationSLADays: 30 },
  { id: "vendor-006", name: "RemoteHealth Connect", type: "telehealth_platform", contractType: "baa_telehealth_remote_monitoring_services", contactName: "Natalie Simmons", contactEmail: "bipuladk60+v06@gmail.com", contactPhone: "(662) 773-2200", address: "120 Telecom Row, Oxford, MS 38655", requiresSubcontractorCompliance: true, requiresSoc2Report: true, breachNotificationSLADays: 15 },
  // ── e-Prescribing / PMP ──
  { id: "vendor-007", name: "ScriptGuard Rx", type: "eprescribing_pmp", contractType: "baa_eprescribing_pmp_integration_services", contactName: "Robert Kline", contactEmail: "bipuladk60+v07@gmail.com", contactPhone: "(601) 634-7700", address: "900 Prescription Plaza, Vicksburg, MS 39180", requiresSubcontractorCompliance: false, requiresSoc2Report: false, breachNotificationSLADays: 60 },
  { id: "vendor-008", name: "Delta Pharmacy Solutions", type: "eprescribing_pmp", contractType: "baa_eprescribing_pmp_integration_services", contactName: "Karen Mitchell", contactEmail: "bipuladk60+v08@gmail.com", contactPhone: "(662) 334-9100", address: "55 Commerce St, Greenville, MS 38701", requiresSubcontractorCompliance: false, requiresSoc2Report: false, breachNotificationSLADays: 60 },
  // ── Medical Records Storage ──
  { id: "vendor-009", name: "IronVault Document Services", type: "medical_records_storage", contractType: "baa_medical_records_storage_roi_services", contactName: "Thomas Grant", contactEmail: "bipuladk60+v09@gmail.com", contactPhone: "(662) 842-6600", address: "1800 Secure Archive Ln, Tupelo, MS 38801", requiresSubcontractorCompliance: true, requiresSoc2Report: true, breachNotificationSLADays: 30 },
  { id: "vendor-010", name: "MedArchive Pro", type: "medical_records_storage", contractType: "baa_medical_records_storage_roi_services", contactName: "Diane Carpenter", contactEmail: "bipuladk60+v10@gmail.com", contactPhone: "(601) 483-2000", address: "425 Record Center Dr, Meridian, MS 39301", requiresSubcontractorCompliance: true, requiresSoc2Report: true, breachNotificationSLADays: 30 },
  // ── Other / Mixed ──
  { id: "vendor-011", name: "GulfStar Billing Group", type: "other", contractType: "other", contactName: "Patricia Nguyen", contactEmail: "bipuladk60+v11@gmail.com", contactPhone: "(228) 467-3300", address: "680 Beach Blvd, Suite 250, Gulfport, MS 39501", requiresSubcontractorCompliance: false, requiresSoc2Report: false, breachNotificationSLADays: 60 },
  { id: "vendor-012", name: "Magnolia IT Consulting", type: "other", contractType: "other", contactName: "David Reeves", contactEmail: "bipuladk60+v12@gmail.com", contactPhone: "(601) 992-4500", address: "2100 Lakeland Dr, Suite 300, Jackson, MS 39232", requiresSubcontractorCompliance: true, requiresSoc2Report: true, breachNotificationSLADays: 30 },
  { id: "vendor-013", name: "Bayou Medical Courier", type: "other", contractType: "other", contactName: "Andre Williams", contactEmail: "bipuladk60+v13@gmail.com", contactPhone: "(601) 544-8800", address: "1450 Pine Belt Pkwy, Hattiesburg, MS 39402", requiresSubcontractorCompliance: false, requiresSoc2Report: false, breachNotificationSLADays: 60 },
  { id: "vendor-014", name: "Riverbend Transcription Services", type: "other", contractType: "other", contactName: "Laura Chen", contactEmail: "bipuladk60+v14@gmail.com", contactPhone: "(662) 453-1100", address: "320 Delta Ave, Greenwood, MS 38930", requiresSubcontractorCompliance: false, requiresSoc2Report: false, breachNotificationSLADays: 60 },
  { id: "vendor-015", name: "Sentinel Cybersecurity", type: "other", contractType: "other", contactName: "Michael Okafor", contactEmail: "bipuladk60+v15@gmail.com", contactPhone: "(601) 355-6200", address: "5000 Cyber Center Blvd, Brandon, MS 39042", requiresSubcontractorCompliance: true, requiresSoc2Report: true, breachNotificationSLADays: 10 },
  // ── Additional EHR / Telehealth for variety ──
  { id: "vendor-016", name: "NexGen Patient Portal", type: "ehr_platform", contractType: "baa_ehr_platform_services", contactName: "Samantha Cole", contactEmail: "bipuladk60+v16@gmail.com", contactPhone: "(601) 718-3400", address: "770 Digital Health Way, Clinton, MS 39056", requiresSubcontractorCompliance: true, requiresSoc2Report: true, breachNotificationSLADays: 10 },
  { id: "vendor-017", name: "CarePoint Mobile Health", type: "telehealth_platform", contractType: "baa_telehealth_remote_monitoring_services", contactName: "Jason Patel", contactEmail: "bipuladk60+v17@gmail.com", contactPhone: "(228) 388-5500", address: "990 Mobile Med Park, Ocean Springs, MS 39564", requiresSubcontractorCompliance: true, requiresSoc2Report: false, breachNotificationSLADays: 30 },
  { id: "vendor-018", name: "Crossroads Imaging Solutions", type: "reference_laboratory", contractType: "baa_reference_laboratory_services", contactName: "Dr. Helen Morales", contactEmail: "bipuladk60+v18@gmail.com", contactPhone: "(601) 636-2200", address: "1200 Diagnostic Center Rd, Vicksburg, MS 39180", requiresSubcontractorCompliance: false, requiresSoc2Report: true, breachNotificationSLADays: 60 },
  { id: "vendor-019", name: "PineHill Wellness Analytics", type: "other", contractType: "other", contactName: "Ryan Brooks", contactEmail: "bipuladk60+v19@gmail.com", contactPhone: "(601) 264-7700", address: "600 Analytics Park, Laurel, MS 39440", requiresSubcontractorCompliance: false, requiresSoc2Report: false, breachNotificationSLADays: 60 },
  { id: "vendor-020", name: "Capitol Shred & Disposal", type: "other", contractType: "other", contactName: "Gloria Hernandez", contactEmail: "bipuladk60+v20@gmail.com", contactPhone: "(601) 956-3100", address: "85 Industrial Loop, Pearl, MS 39208", requiresSubcontractorCompliance: false, requiresSoc2Report: false, breachNotificationSLADays: 60 },
];

const baas: BAASeed[] = [
  // ── ACTIVE (8) — healthy, signed, not expiring soon ──
  { id: "baa-001", vendorId: "vendor-001", status: "active", effectiveDate: "2024-01-15", expirationDate: "2026-12-15", signedDate: "2024-01-15T10:30:00.000Z", signedBy: "Dr. Rebecca Torres", termYears: 2, requiresStateLawRetentionNotice: false, contractType: "baa_ehr_platform_services" },
  { id: "baa-005", vendorId: "vendor-005", status: "active", effectiveDate: "2025-01-01", expirationDate: "2027-01-01", signedDate: "2025-01-02T09:00:00.000Z", signedBy: "Priya Desai", termYears: 2, requiresStateLawRetentionNotice: false, contractType: "baa_telehealth_remote_monitoring_services" },
  { id: "baa-009", vendorId: "vendor-009", status: "active", effectiveDate: "2024-06-01", expirationDate: "2026-06-01", signedDate: "2024-06-02T14:00:00.000Z", signedBy: "Thomas Grant", termYears: 2, requiresStateLawRetentionNotice: true, contractType: "baa_medical_records_storage_roi_services" },
  { id: "baa-010", vendorId: "vendor-010", status: "active", effectiveDate: "2025-03-01", expirationDate: "2027-03-01", signedDate: "2025-03-01T11:30:00.000Z", signedBy: "Diane Carpenter", termYears: 2, requiresStateLawRetentionNotice: true, contractType: "baa_medical_records_storage_roi_services" },
  { id: "baa-012", vendorId: "vendor-012", status: "active", effectiveDate: "2025-06-01", expirationDate: "2027-06-01", signedDate: "2025-06-02T08:45:00.000Z", signedBy: "David Reeves", termYears: 2, requiresStateLawRetentionNotice: false, contractType: "other" },
  { id: "baa-015", vendorId: "vendor-015", status: "active", effectiveDate: "2025-09-01", expirationDate: "2027-09-01", signedDate: "2025-09-01T16:00:00.000Z", signedBy: "Michael Okafor", termYears: 2, requiresStateLawRetentionNotice: false, contractType: "other" },
  { id: "baa-016", vendorId: "vendor-016", status: "active", effectiveDate: "2025-02-15", expirationDate: "2027-02-15", signedDate: "2025-02-16T10:00:00.000Z", signedBy: "Samantha Cole", termYears: 2, requiresStateLawRetentionNotice: false, contractType: "baa_ehr_platform_services" },
  { id: "baa-020", vendorId: "vendor-020", status: "active", effectiveDate: "2025-11-01", expirationDate: "2026-11-01", signedDate: "2025-11-01T13:00:00.000Z", signedBy: "Gloria Hernandez", termYears: 1, requiresStateLawRetentionNotice: false, contractType: "other" },

  // ── EXPIRING SOON (4) — signed but expiring within 90 days ──
  { id: "baa-003", vendorId: "vendor-003", status: "expiring_soon", effectiveDate: "2024-05-01", expirationDate: "2026-05-01", signedDate: "2024-05-02T09:00:00.000Z", signedBy: "Dr. Angela Park", termYears: 2, requiresStateLawRetentionNotice: false, contractType: "baa_reference_laboratory_services" },
  { id: "baa-006", vendorId: "vendor-006", status: "expiring_soon", effectiveDate: "2024-06-15", expirationDate: "2026-06-15", signedDate: "2024-06-16T11:00:00.000Z", signedBy: "Natalie Simmons", termYears: 2, requiresStateLawRetentionNotice: false, contractType: "baa_telehealth_remote_monitoring_services" },
  { id: "baa-011", vendorId: "vendor-011", status: "expiring_soon", effectiveDate: "2024-07-01", expirationDate: "2026-04-15", signedDate: "2024-07-02T15:30:00.000Z", signedBy: "Patricia Nguyen", termYears: 2, requiresStateLawRetentionNotice: false, contractType: "other" },
  { id: "baa-018", vendorId: "vendor-018", status: "expiring_soon", effectiveDate: "2024-04-01", expirationDate: "2026-04-01", signedDate: "2024-04-02T10:00:00.000Z", signedBy: "Dr. Helen Morales", termYears: 2, requiresStateLawRetentionNotice: false, contractType: "baa_reference_laboratory_services" },

  // ── EXPIRED (4) — past expiration date, need renewal ──
  { id: "baa-002", vendorId: "vendor-002", status: "expired", effectiveDate: "2023-03-01", expirationDate: "2025-03-01", signedDate: "2023-03-02T14:00:00.000Z", signedBy: "Marcus Webb", termYears: 2, requiresStateLawRetentionNotice: false, contractType: "baa_ehr_platform_services" },
  { id: "baa-004", vendorId: "vendor-004", status: "expired", effectiveDate: "2023-08-01", expirationDate: "2025-08-01", signedDate: "2023-08-01T09:30:00.000Z", signedBy: "James Whitfield", termYears: 2, requiresStateLawRetentionNotice: false, contractType: "baa_reference_laboratory_services" },
  { id: "baa-013", vendorId: "vendor-013", status: "expired", effectiveDate: "2023-01-15", expirationDate: "2025-01-15", signedDate: "2023-01-16T08:00:00.000Z", signedBy: "Andre Williams", termYears: 2, requiresStateLawRetentionNotice: false, contractType: "other" },
  { id: "baa-014", vendorId: "vendor-014", status: "expired", effectiveDate: "2022-11-01", expirationDate: "2024-11-01", signedDate: "2022-11-02T10:00:00.000Z", signedBy: "Laura Chen", termYears: 2, requiresStateLawRetentionNotice: false, contractType: "other" },

  // ── PENDING SIGNATURE (4) — sent but not yet signed ──
  { id: "baa-007", vendorId: "vendor-007", status: "pending_signature", effectiveDate: "2026-04-01", expirationDate: "2027-04-01", signedDate: null, signedBy: null, termYears: 1, requiresStateLawRetentionNotice: false, contractType: "baa_eprescribing_pmp_integration_services" },
  { id: "baa-008", vendorId: "vendor-008", status: "pending_signature", effectiveDate: "2026-05-01", expirationDate: "2027-05-01", signedDate: null, signedBy: null, termYears: 1, requiresStateLawRetentionNotice: false, contractType: "baa_eprescribing_pmp_integration_services" },
  { id: "baa-017", vendorId: "vendor-017", status: "pending_signature", effectiveDate: "2026-04-15", expirationDate: "2028-04-15", signedDate: null, signedBy: null, termYears: 2, requiresStateLawRetentionNotice: false, contractType: "baa_telehealth_remote_monitoring_services" },
  { id: "baa-019", vendorId: "vendor-019", status: "pending_signature", effectiveDate: "2026-06-01", expirationDate: "2027-06-01", signedDate: null, signedBy: null, termYears: 1, requiresStateLawRetentionNotice: false, contractType: "other" },
];

interface AuditSeed {
  id: string;
  baaId: string;
  vendorId: string;
  action: string;
  performedBy: string;
  performedAt: string;
  details: Record<string, string | number | boolean | null>;
  ipAddress: string | null;
}

function generateAuditLogs(): AuditSeed[] {
  const logs: AuditSeed[] = [];
  let logIndex = 1;
  const today = new Date();
  const ADMIN_NAME = "Dr. Catherine Brooks";

  // Clamp a date to the past — if it's in the future, shift it back
  function clampToPast(date: Date, maxDaysAgo: number = 3): Date {
    if (date > today) {
      // Put it a few days ago instead
      const daysAgo = maxDaysAgo + Math.floor(Math.random() * 10);
      return new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    }
    return date;
  }

  for (const baa of baas) {
    const vendor = vendors.find((v) => v.id === baa.vendorId);
    const vendorName = vendor?.name ?? "Unknown";

    const effectiveDate = new Date(baa.effectiveDate);
    const createdDate = clampToPast(new Date(effectiveDate.getTime() - 7 * 24 * 60 * 60 * 1000), 5);
    const invitedDate = clampToPast(new Date(createdDate.getTime() + 1 * 24 * 60 * 60 * 1000), 4);

    // Log 1: BAA created
    logs.push({
      id: `log-${String(logIndex++).padStart(3, "0")}`,
      baaId: baa.id,
      vendorId: baa.vendorId,
      action: "BAA created",
      performedBy: ADMIN_NAME,
      performedAt: createdDate.toISOString(),
      details: { vendorName, contractType: baa.contractType },
      ipAddress: "192.168.1.100",
    });

    // Log 2: Invitation sent
    logs.push({
      id: `log-${String(logIndex++).padStart(3, "0")}`,
      baaId: baa.id,
      vendorId: baa.vendorId,
      action: "Invitation email sent",
      performedBy: "System",
      performedAt: invitedDate.toISOString(),
      details: {
        recipient: vendor?.contactEmail ?? "",
        vendorName,
      },
      ipAddress: null,
    });

    // Log 3: Status-dependent action
    if (baa.signedDate) {
      const signedDate = clampToPast(new Date(baa.signedDate));
      logs.push({
        id: `log-${String(logIndex++).padStart(3, "0")}`,
        baaId: baa.id,
        vendorId: baa.vendorId,
        action: "BAA signed",
        performedBy: baa.signedBy ?? vendorName,
        performedAt: signedDate.toISOString(),
        details: { signedBy: baa.signedBy ?? "", vendorName },
        ipAddress: "192.168.1.100",
      });
    } else {
      const reminderDate = clampToPast(new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000));
      logs.push({
        id: `log-${String(logIndex++).padStart(3, "0")}`,
        baaId: baa.id,
        vendorId: baa.vendorId,
        action: "Reminder sent",
        performedBy: "System",
        performedAt: reminderDate.toISOString(),
        details: {
          type: "pending_signature_reminder",
          vendorName,
        },
        ipAddress: null,
      });
    }
  }

  return logs;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed(): Promise<void> {
  /* eslint-disable no-console */
  const args = process.argv.slice(2);
  const shouldReset = args.includes("--reset");

  if (shouldReset) {
    await deleteAllRecords();
  }

  console.log("Seeding clinic...");
  await putItem({
    PK: `CLINIC#${CLINIC_ID}`,
    SK: "METADATA",
    entityType: "Clinic",
    id: CLINIC_ID,
    name: "Central Mississippi Health District",
    address: "570 East Woodrow Wilson Ave, Jackson, MS 39216",
    contactName: "Dr. Catherine Brooks",
    contactEmail: "bipuladk60+clinic@gmail.com",
    hipaaOfficer: "James Tran, J.D., CIPP/US",
    npi: "1928374650",
  });

  console.log("Seeding vendors...");
  for (const vendor of vendors) {
    await putItem({
      PK: `VENDOR#${vendor.id}`,
      SK: "METADATA",
      GSI1PK: `CLINIC#${CLINIC_ID}`,
      GSI1SK: `VENDOR#${vendor.id}`,
      entityType: "Vendor",
      ...vendor,
      createdAt: now,
      updatedAt: now,
    });
  }

  console.log("Seeding BAAs...");
  for (const baa of baas) {
    // Main BAA record
    await putItem({
      PK: `BAA#${baa.id}`,
      SK: "METADATA",
      GSI1PK: `STATUS#${baa.status}`,
      GSI1SK: `EXPIRY#${baa.expirationDate}`,
      entityType: "BAA",
      ...baa,
      clinicId: CLINIC_ID,
      documentUrl: null,
      signedDocumentUrl: baa.signedDocumentUrl ?? null,
      signingCertificate: baa.signingCertificate ?? null,
      signedSnapshot: baa.signedSnapshot ?? null,
      documentVersion: baa.documentVersion ?? 1,
      parentBaaId: baa.parentBaaId ?? null,
      versionType: baa.versionType ?? "original",
      templateVersion: "v1.0.0",
      createdAt: now,
      updatedAt: now,
    });

    // Vendor cross-reference
    await putItem({
      PK: `VENDOR#${baa.vendorId}`,
      SK: `BAA#${baa.id}`,
      entityType: "BAAVendorRef",
      baaId: baa.id,
      vendorId: baa.vendorId,
      clinicId: CLINIC_ID,
    });
  }

  // Audit logs are NOT seeded — they are created organically through real user actions.
  // This ensures the history page only shows genuine events.

  console.log(
    `Seeding complete: 1 clinic, ${vendors.length} vendors, ${baas.length} BAAs. Audit logs will be created from real actions.`,
  );
  /* eslint-enable no-console */
}

seed().catch((err) => {
  /* eslint-disable no-console */
  console.error("Seed failed:", err);
  process.exit(1);
  /* eslint-enable no-console */
});
