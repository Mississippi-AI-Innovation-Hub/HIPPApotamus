// ─── Enums ────────────────────────────────────────────────────────────────────

export type BAAStatus =
  | "active"
  | "expiring_soon"
  | "expired"
  | "pending_signature";

export type UserRole = "admin" | "vendor";

/**
 * Broad PHI exposure category for the vendor. Maps directly to the five
 * vendor archetypes in the Mississippi DOH BAA program.
 */
export type VendorType =
  | "ehr_platform"
  | "reference_laboratory"
  | "telehealth_platform"
  | "eprescribing_pmp"
  | "medical_records_storage"
  | "other";

/**
 * Canonical contract titles used in the Mississippi DOH BAA program.
 * Each maps to the formal document name that appears in the signed PDF.
 */
export type ContractType =
  | "baa_ehr_platform_services"
  | "baa_reference_laboratory_services"
  | "baa_telehealth_remote_monitoring_services"
  | "baa_eprescribing_pmp_integration_services"
  | "baa_medical_records_storage_roi_services"
  | "other";

// ─── Signing / Snapshot Types ─────────────────────────────────────────────────

export interface SigningCertificate {
  signerName: string;
  signerEmail: string;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
  consentGrantedAt: string;
  method: 'drawn_signature' | 'typed_name' | 'click_to_accept';
}

export interface SignedSnapshot {
  vendorName: string;
  vendorAddress: string;
  vendorContactName: string;
  vendorContactEmail: string;
  clinicName: string;
  clinicAddress: string;
  effectiveDate: string;
  expirationDate: string;
  contractType: string;
  templateVersion: string;
  termYears: number;
}

// ─── Core Domain Objects ──────────────────────────────────────────────────────

export interface Vendor {
  id: string;
  name: string;
  type: VendorType;
  contractType: ContractType;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  /** Whether this vendor requires subcontractor chain compliance documentation. */
  requiresSubcontractorCompliance: boolean;
  /** Annual SOC 2 report required as a contract condition. */
  requiresSoc2Report: boolean;
  /**
   * Breach notification SLA in days. Standard is 60 days (HIPAA default);
   * some contracts (e.g. EHR platforms) tighten this to 10 days.
   */
  breachNotificationSLADays: number;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface BAA {
  id: string;
  vendorId: string;
  clinicId: string;
  contractType: ContractType;
  status: BAAStatus;
  /** ISO 8601 date the BAA takes legal effect. */
  effectiveDate: string;
  /** ISO 8601 date the BAA expires. Null until set. */
  expirationDate: string;
  /** ISO 8601 date the BAA was fully executed (all parties signed). */
  signedDate: string | null;
  /** Name or user ID of the person who completed the final signature. */
  signedBy: string | null;
  /** S3 URL to the signed PDF document. */
  documentUrl: string | null;
  /** Version identifier of the BAA template used (e.g. "v2.1.0"). */
  templateVersion: string;
  /**
   * Contract term in years. Drives expiration calculation.
   * Short-term contracts (e.g. e-prescribing) are 1 year; most others are 2.
   */
  termYears: 1 | 2;
  /**
   * Mississippi state law requires 10-year medical records retention.
   * Flag is set for DataVault-class vendors to surface this requirement in the UI.
   */
  requiresStateLawRetentionNotice: boolean;
  /** S3 key for the immutable signed PDF. Null until signed. */
  signedDocumentUrl: string | null;
  /** Signing ceremony metadata captured at time of signing. */
  signingCertificate: SigningCertificate | null;
  /** Frozen snapshot of contract data at signing time. */
  signedSnapshot: SignedSnapshot | null;
  /** Document version: 1 for original, increments for amendments/renewals. */
  documentVersion: number;
  /** Links to the parent BAA if this is an amendment or renewal. */
  parentBaaId: string | null;
  /** Type of this document version. */
  versionType: 'original' | 'amendment' | 'renewal' | 'extension';
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  baaId: string;
  vendorId: string;
  /** Human-readable action label, e.g. "BAA signed", "Reminder sent". */
  action: string;
  /** User ID or system identifier that triggered the action. */
  performedBy: string;
  /** ISO 8601 timestamp of the action. */
  performedAt: string;
  /** Arbitrary structured detail — e.g. email recipient, template version. */
  details: Record<string, string | number | boolean | null>;
  ipAddress: string | null;
}

export interface Clinic {
  id: string;
  name: string;
  address: string;
  contactName: string;
  contactEmail: string;
  /** Name of the designated HIPAA Privacy/Security Officer for this clinic. */
  hipaaOfficer: string;
  /** National Provider Identifier. */
  npi: string;
}

// ─── Auth / Session ───────────────────────────────────────────────────────────

/**
 * Shape of the user object stored in the Auth.js session.
 * Exactly one of clinicId or vendorId will be present depending on role.
 */
export type SessionUser =
  | {
      id: string;
      email: string;
      name: string;
      role: "admin";
      clinicId: string;
      vendorId?: never;
    }
  | {
      id: string;
      email: string;
      name: string;
      role: "vendor";
      vendorId: string;
      clinicId?: never;
    };

// ─── Seed / Mock Data Types ───────────────────────────────────────────────────

/**
 * Lightweight record used during seeding and testing to represent
 * a known vendor + BAA pair without full DynamoDB hydration.
 */
export interface VendorSeedRecord {
  vendor: Omit<Vendor, "createdAt" | "updatedAt">;
  baa: Omit<
    BAA,
    | "id"
    | "clinicId"
    | "status"
    | "signedDate"
    | "signedBy"
    | "documentUrl"
    | "signedDocumentUrl"
    | "signingCertificate"
    | "signedSnapshot"
    | "documentVersion"
    | "parentBaaId"
    | "versionType"
    | "createdAt"
    | "updatedAt"
  >;
}
