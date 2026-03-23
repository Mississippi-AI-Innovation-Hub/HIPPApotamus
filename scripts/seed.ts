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
}

const now = new Date().toISOString();

const vendors: VendorSeed[] = [
  {
    id: "vendor-001",
    name: "CareCloud EHR",
    type: "ehr_platform",
    contractType: "baa_ehr_platform_services",
    contactName: "Dr. Sarah Mitchell",
    contactEmail: "s.mitchell@carecloud-ehr.com",
    contactPhone: "(601) 555-0101",
    address: "100 Healthcare Drive, Jackson, MS 39201",
    requiresSubcontractorCompliance: true,
    requiresSoc2Report: true,
    breachNotificationSLADays: 10,
  },
  {
    id: "vendor-002",
    name: "MedBridge Lab",
    type: "reference_laboratory",
    contractType: "baa_reference_laboratory_services",
    contactName: "James Wilson",
    contactEmail: "j.wilson@medbridgelab.com",
    contactPhone: "(601) 555-0202",
    address: "250 Lab Parkway, Biloxi, MS 39530",
    requiresSubcontractorCompliance: false,
    requiresSoc2Report: true,
    breachNotificationSLADays: 60,
  },
  {
    id: "vendor-003",
    name: "TeleHealth Connect",
    type: "telehealth_platform",
    contractType: "baa_telehealth_remote_monitoring_services",
    contactName: "Maria Garcia",
    contactEmail: "m.garcia@telehealthconnect.com",
    contactPhone: "(601) 555-0303",
    address: "75 Digital Health Blvd, Hattiesburg, MS 39401",
    requiresSubcontractorCompliance: true,
    requiresSoc2Report: false,
    breachNotificationSLADays: 30,
  },
  {
    id: "vendor-004",
    name: "SecureRx Pharmacy",
    type: "eprescribing_pmp",
    contractType: "baa_eprescribing_pmp_integration_services",
    contactName: "Robert Chen",
    contactEmail: "r.chen@securerx.com",
    contactPhone: "(601) 555-0404",
    address: "400 Pharmacy Row, Meridian, MS 39301",
    requiresSubcontractorCompliance: false,
    requiresSoc2Report: false,
    breachNotificationSLADays: 60,
  },
  {
    id: "vendor-005",
    name: "DataVault Health",
    type: "medical_records_storage",
    contractType: "baa_medical_records_storage_roi_services",
    contactName: "Linda Thompson",
    contactEmail: "l.thompson@datavaulthealth.com",
    contactPhone: "(601) 555-0505",
    address: "900 Data Center Way, Tupelo, MS 38801",
    requiresSubcontractorCompliance: true,
    requiresSoc2Report: true,
    breachNotificationSLADays: 30,
  },
];

const baas: BAASeed[] = [
  {
    id: "baa-001",
    vendorId: "vendor-001",
    status: "active",
    effectiveDate: "2024-01-15",
    expirationDate: "2026-01-15",
    signedDate: "2024-01-15T10:30:00.000Z",
    signedBy: "HIPAA Officer",
    termYears: 2,
    requiresStateLawRetentionNotice: false,
    contractType: "baa_ehr_platform_services",
  },
  {
    id: "baa-002",
    vendorId: "vendor-002",
    status: "expiring_soon",
    effectiveDate: "2024-03-01",
    expirationDate: "2026-04-01",
    signedDate: "2024-03-01T14:00:00.000Z",
    signedBy: "HIPAA Officer",
    termYears: 2,
    requiresStateLawRetentionNotice: false,
    contractType: "baa_reference_laboratory_services",
  },
  {
    id: "baa-003",
    vendorId: "vendor-003",
    status: "expired",
    effectiveDate: "2023-06-15",
    expirationDate: "2025-06-15",
    signedDate: "2023-06-15T09:00:00.000Z",
    signedBy: "HIPAA Officer",
    termYears: 2,
    requiresStateLawRetentionNotice: false,
    contractType: "baa_telehealth_remote_monitoring_services",
  },
  {
    id: "baa-004",
    vendorId: "vendor-004",
    status: "pending_signature",
    effectiveDate: "2026-04-01",
    expirationDate: "2027-04-01",
    signedDate: null,
    signedBy: null,
    termYears: 1,
    requiresStateLawRetentionNotice: false,
    contractType: "baa_eprescribing_pmp_integration_services",
  },
  {
    id: "baa-005",
    vendorId: "vendor-005",
    status: "active",
    effectiveDate: "2024-09-01",
    expirationDate: "2026-09-01",
    signedDate: "2024-09-01T11:15:00.000Z",
    signedBy: "HIPAA Officer",
    termYears: 2,
    requiresStateLawRetentionNotice: true,
    contractType: "baa_medical_records_storage_roi_services",
  },
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

  for (const baa of baas) {
    const vendor = vendors.find((v) => v.id === baa.vendorId);
    const vendorName = vendor?.name ?? "Unknown";

    // Log 1: BAA created
    logs.push({
      id: `log-${String(logIndex++).padStart(3, "0")}`,
      baaId: baa.id,
      vendorId: baa.vendorId,
      action: "BAA created",
      performedBy: "user-001",
      performedAt: new Date(
        new Date(baa.effectiveDate).getTime() - 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      details: { vendorName, contractType: baa.contractType },
      ipAddress: "192.168.1.100",
    });

    // Log 2: Invitation sent
    logs.push({
      id: `log-${String(logIndex++).padStart(3, "0")}`,
      baaId: baa.id,
      vendorId: baa.vendorId,
      action: "Invitation email sent",
      performedBy: "system",
      performedAt: new Date(
        new Date(baa.effectiveDate).getTime() - 6 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      details: {
        recipient: vendor?.contactEmail ?? "",
        vendorName,
      },
      ipAddress: null,
    });

    // Log 3: Status-dependent action
    if (baa.signedDate) {
      logs.push({
        id: `log-${String(logIndex++).padStart(3, "0")}`,
        baaId: baa.id,
        vendorId: baa.vendorId,
        action: "BAA signed",
        performedBy: "user-001",
        performedAt: baa.signedDate,
        details: { signedBy: baa.signedBy ?? "", vendorName },
        ipAddress: "192.168.1.100",
      });
    } else {
      logs.push({
        id: `log-${String(logIndex++).padStart(3, "0")}`,
        baaId: baa.id,
        vendorId: baa.vendorId,
        action: "Reminder sent",
        performedBy: "system",
        performedAt: new Date(
          new Date(baa.effectiveDate).getTime() - 1 * 24 * 60 * 60 * 1000,
        ).toISOString(),
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
    name: "Mississippi DOH Central Region",
    address: "570 E Woodrow Wilson Ave, Jackson, MS 39216",
    contactName: "Dr. Amanda Richardson",
    contactEmail: "a.richardson@msdoh.ms.gov",
    hipaaOfficer: "Thomas J. Bradley, JD, CIPP/US",
    npi: "1234567890",
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

  console.log("Seeding audit logs...");
  const auditLogs = generateAuditLogs();
  for (const log of auditLogs) {
    await putItem({
      PK: `BAA#${log.baaId}`,
      SK: `LOG#${log.performedAt}#${log.id}`,
      entityType: "AuditLog",
      ...log,
    });
  }

  console.log(
    `Seeding complete: 1 clinic, ${vendors.length} vendors, ${baas.length} BAAs, ${auditLogs.length} audit logs.`,
  );
  /* eslint-enable no-console */
}

seed().catch((err) => {
  /* eslint-disable no-console */
  console.error("Seed failed:", err);
  process.exit(1);
  /* eslint-enable no-console */
});
