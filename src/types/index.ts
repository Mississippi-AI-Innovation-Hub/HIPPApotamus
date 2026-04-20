// ─── Enums ────────────────────────────────────────────────────────────────────

export type BAAStatus =
  | "active"
  | "expiring_soon"
  | "expired"
  | "pending_signature"
  | "pending_countersignature"
  | "terminated"
  | "declined";

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

// ─── Template Types ──────────────────────────────────────────────────────────

export interface BAATemplate {
  version: string;
  effectiveDate: string;
  approvedBy: string;
  supersedes: string | null;
  sourceDocument: string;
  cfrMappings: Record<string, string>;
  changeLog: string[];
}

/**
 * Values required to populate the MSDH BAA template placeholders.
 * Matches the {{PLACEHOLDER}} markers in the template text.
 */
export interface MSDHTemplateValues {
  BA_NAME: string;
  BA_ADDRESS: string;
  UNDERLYING_AGREEMENT_REF: string;
  BA_NOTICE_NAME: string;
  BA_NOTICE_ATTN: string;
  BA_NOTICE_TITLE: string;
  BA_NOTICE_ADDRESS: string;
  BA_NOTICE_PHONE: string;
  BA_NOTICE_EMAIL: string;
  BA_SIGNER_NAME: string;
  BA_SIGNER_TITLE: string;
  BA_SIGNER_ADDRESS: string;
  BA_SIGNER_PHONE: string;
  BA_SIGNATURE_DATE: string;
  MSDH_SIGNER_NAME: string;
  MSDH_SIGNER_TITLE: string;
  MSDH_SIGNER_ADDRESS: string;
  MSDH_SIGNER_PHONE: string;
  MSDH_SIGNATURE_DATE: string;
}

/**
 * A single row in the 164.504(e)(2) compliance matrix.
 */
export interface ComplianceMatrixRow {
  cfrCitation: string;
  cfrRequirement: string;
  msdhSection: string;
  msdhSummary: string;
  satisfied: boolean;
}

export interface ComplianceMatrix {
  baaId: string;
  templateVersion: string;
  generatedAt: string;
  rows: ComplianceMatrixRow[];
}

// ─── Signing / Snapshot Types ─────────────────────────────────────────────────

export interface SigningCertificate {
  signerName: string;
  signerEmail: string;
  signerTitle: string;
  signerOrganization: string;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
  consentGrantedAt: string;
  documentPresentedAt: string;
  method: 'drawn_signature' | 'typed_name' | 'click_to_accept';
  finalDocumentHash: string;
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
  /** Full name of the Authorized Representative designated to sign on behalf of this vendor. */
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  /** Job title of the Authorized Representative (e.g., "Chief Privacy Officer"). */
  authorizedSignerTitle: string;
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
  /** SHA-256 hash of the signed PDF document. */
  signedDocumentHash: string | null;
  /** Base64-encoded KMS digital signature of the document hash. */
  kmsSignature: string | null;
  /** ARN of the KMS key used to create the digital signature. */
  kmsKeyArn: string | null;
  /** Counter-signature by the covered entity (clinic). */
  counterSignedDate: string | null;
  counterSignedBy: string | null;
  counterSignerTitle: string | null;
  /** Date the BAA was terminated, if applicable. */
  terminationDate: string | null;
  /** Reason for termination. */
  terminationReason: 'breach' | 'mutual' | 'vendor_closure' | 'regulatory' | 'other' | null;
  /** Notes about the termination. */
  terminationNotes: string | null;
  /** Who terminated the BAA. */
  terminatedBy: string | null;
  /** Whether this BAA was platform-generated or uploaded as vendor paper. */
  source: "generated" | "uploaded";
  /** User who uploaded the vendor-supplied PDF (when source="uploaded"). */
  uploadedBy: string | null;
  /** ISO 8601 timestamp of upload (when source="uploaded"). */
  uploadedAt: string | null;
  /** Name of the attorney/officer who reviewed the uploaded BAA. */
  legalReviewedBy: string | null;
  /** ISO 8601 timestamp of legal review completion. */
  legalReviewedAt: string | null;
  /** Per-threshold reminder send log so cron doesn't double-send. Key
   *  format: "{kind}:{threshold}" (e.g., "expiration:30", "pending_signature:7"). */
  reminderHistory: Record<string, string> | null;
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
    | "signedDocumentHash"
    | "kmsSignature"
    | "kmsKeyArn"
    | "signingCertificate"
    | "signedSnapshot"
    | "documentVersion"
    | "parentBaaId"
    | "versionType"
    | "terminationDate"
    | "terminationReason"
    | "terminationNotes"
    | "terminatedBy"
    | "source"
    | "uploadedBy"
    | "uploadedAt"
    | "legalReviewedBy"
    | "legalReviewedAt"
    | "reminderHistory"
    | "createdAt"
    | "updatedAt"
  >;
}
