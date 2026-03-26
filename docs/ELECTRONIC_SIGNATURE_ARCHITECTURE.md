# Electronic Signature & Document Management Architecture

**HIPAApotamus — HIPAA BAA Management System**
**Document Version:** 1.1
**Last Updated:** March 2026
**Classification:** Internal — Technical Architecture

---

## 1. Overview

This document defines the architecture for electronic signature capture, document generation, secure storage, and integrity verification of HIPAA Business Associate Agreements (BAAs) within HIPAApotamus. The system must be legally defensible under federal and Mississippi state law, compliant with the AWS Well-Architected Healthcare Industry Lens, and aligned with HIPAA Security Rule requirements.

### 1.1 Regulatory Framework

| Regulation                      | Citation                        | Relevance                                                                                                        |
| ------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **ESIGN Act**             | 15 U.S.C. 7001 et seq.          | E-signatures have same legal effect as wet-ink; defines consent, intent, association, and retention requirements |
| **UETA (Mississippi)**    | Miss. Code Ann. 75-12-1 et seq. | State adoption of Uniform Electronic Transactions Act; mirrors ESIGN                                             |
| **HIPAA Security Rule**   | 45 CFR 164.312(c)(1)-(2)        | Integrity controls — protect ePHI from improper alteration or destruction                                       |
| **HIPAA Security Rule**   | 45 CFR 164.312(b)               | Audit controls — record and examine activity in systems with ePHI                                               |
| **HIPAA Security Rule**   | 45 CFR 164.312(e)(1)            | Transmission security — encrypt data in transit                                                                 |
| **HIPAA Privacy Rule**    | 45 CFR 164.530(j)(2)            | Retention — 6 years from creation or last-in-effect date                                                        |
| **Mississippi State Law** | Miss. Code Ann. 41-9-69         | Hospital records — 10-year retention for adult patients                                                         |
| **HIPAA Privacy Rule**    | 45 CFR 164.504(e)               | Required BAA provisions — all 10 HHS elements                                                                   |
| **AWS Healthcare Lens**   | HCL_SEC7                        | Encrypt health data at rest and in transit at all times                                                          |
| **AWS Healthcare Lens**   | HCL_SEC3                        | Log access to health data; configure audit logs to be centralized and immutable                                  |
| **NIST SP 800-177**       | Email Security                  | Digital signatures, DKIM/DMARC for email integrity                                                               |

### 1.2 Terminology — Electronic Signature vs. Digital Signature

These terms are legally and technically distinct. Conflating them during an audit is a red flag.

| Term                           | Definition                                                                                                                                            | Example in Our System                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Electronic Signature** | The*act* of signing — the human intent expressed through a drawn image, typed name, or click-to-accept. This is what the signer does.              | The PNG drawn on the canvas; the "I agree" checkbox                         |
| **Digital Signature**    | The*math* — a cryptographic operation (KMS + SHA-256) that binds the signer's intent to a specific document version. This is what the system does. | The KMS `ECDSA_SHA_256` signature blob stored alongside the document hash |

**How they relate:** The KMS Digital Signature **wraps** the Electronic Signature. The digital signature proves that a specific document (identified by its SHA-256 hash) was sealed at a specific time using a specific key. The electronic signature (the drawn image + metadata) proves a specific human intended to sign. Together, they form a complete, legally defensible signing record.

Auditors will ask: *"How do you know this document hasn't been altered since signing?"* The answer is the **digital signature** (KMS). They will then ask: *"How do you know this person intended to sign?"* The answer is the **electronic signature** (canvas + consent + metadata).

### 1.3 Design Principles (from AWS Healthcare Industry Lens)

- **Encrypt all sensitive data** at rest and in transit (required by AWS BAA Addendum)
- **Log everything** with immutable, centralized audit logs
- **Implement least privilege** for all data access
- **Automate compliance-as-code** via CDK and AWS Config
- **Plan to recover from failures** with monitoring and automated recovery

---

## 2. Signing Ceremony Architecture

The "Signing Ceremony" is the complete workflow from document presentation to signed document storage. Every step must be logged and verifiable.

### 2.1 Ceremony Flow

```
                              ┌──────────────────────────────┐
                              │  0. IDENTITY CHALLENGE         │
                              │  a) Magic Link token verified  │
                              │  b) Email OTP sent to          │
                              │     registered contact         │
                              │  c) Signer enters OTP          │
                              │  d) Identity confirmed          │
                              │  Log: MAGIC_LINK_ACCESSED      │
                              │  Log: OTP_SENT                 │
                              │  Log: OTP_VERIFIED             │
                              └──────────────┬───────────────┘
                                             │
                                    ┌─────────────────┐
                                    │  1. DRAFT PHASE  │
                                    └────────┬────────┘
                                             │
                              ┌──────────────▼──────────────┐
                              │  Generate Draft PDF from     │
                              │  BAA template + vendor data  │
                              │  Compute SHA-256 hash        │
                              │  Store draft hash in session │
                              └──────────────┬──────────────┘
                                             │
                              ┌──────────────▼──────────────┐
                              │  2. PRESENTATION PHASE       │
                              │  Display full contract text  │
                              │  Enable "Download Draft"     │
                              │  Log: DOCUMENT_PRESENTED     │
                              └──────────────┬──────────────┘
                                             │
                              ┌──────────────▼──────────────┐
                              │  3. CONSENT PHASE            │
                              │  "I agree to sign this       │
                              │   document electronically"   │
                              │  Log: ESIGN_CONSENT_GRANTED  │
                              └──────────────┬──────────────┘
                                             │
                              ┌──────────────▼──────────────┐
                              │  4. SIGNATURE CAPTURE        │
                              │  Canvas drawn signature      │
                              │  (captured at 2x resolution) │
                              │  OR typed name + title       │
                              │  Log: SIGNATURE_CAPTURED     │
                              └──────────────┬──────────────┘
                                             │
                              ┌──────────────▼──────────────┐
                              │  5. IDENTITY CONFIRMATION    │
                              │  Signer full name            │
                              │  Signer job title            │
                              │  Signer email                │
                              │  Log: IDENTITY_CONFIRMED     │
                              └──────────────┬──────────────┘
                                             │
                              ┌──────────────▼──────────────┐
                              │  6. DOCUMENT FINALIZATION    │
                              │  Embed signature image       │
                              │  Embed signing metadata      │
                              │  Flatten to final PDF        │
                              │  Compute final SHA-256 hash  │
                              │  Sign hash via AWS KMS       │
                              │  Log: DOCUMENT_SIGNED        │
                              └──────────────┬──────────────┘
                                             │
                              ┌──────────────▼──────────────┐
                              │  7. IMMUTABLE STORAGE        │
                              │  Upload to S3 (Object Lock)  │
                              │  Store hash + KMS sig in DB  │
                              │  Generate Certificate of     │
                              │  Completion (audit PDF)      │
                              │  Log: DOCUMENT_STORED        │
                              └──────────────┬──────────────┘
                                             │
                              ┌──────────────▼──────────────┐
                              │  8. DELIVERY & NOTIFICATION  │
                              │  Email confirmation to signer │
                              │  Email notification to admin │
                              │  Provide download link       │
                              │  Log: CONFIRMATION_SENT      │
                              └─────────────────────────────┘
```

### 2.2 Step 0: Identity Challenge (Signer Authorization)

The `/sign/[baaId]` page is public — no Cognito login required. However, the system must verify that the person accessing the page is the intended signer before showing the document. Unauthorized access to a BAA document is a compliance violation.

**Approach: Magic Link with Short-Lived Signed Token**

The email invitation contains a signed URL:

```
https://app.hipaapotamus.com/sign/baa-007?token=eyJhbGciOiJIUzI1NiIs...
```

Token structure (HMAC-SHA256, signed with `NEXTAUTH_SECRET`):

```json
{
  "baaId": "baa-007",
  "vendorId": "vendor-007",
  "email": "r.kline@scriptguardrx.com",
  "exp": 1711468800,  // 72 hours from creation
  "iat": 1711296000
}
```

**Verification flow:**

1. Signer clicks link in email
2. Server verifies token signature (HMAC-SHA256) and expiration
3. If valid: show the document, log `DOCUMENT_PRESENTED`
4. If expired: show "This link has expired. Contact your compliance officer for a new one."
5. If invalid: show "Invalid signing link." Do not reveal whether the BAA exists.

**Alternative: Email OTP (Enhanced Security)**

For higher-assurance scenarios, combine the magic link with an email OTP:

1. Signer clicks magic link → token verified → landing page shown
2. System sends a 6-digit OTP to the signer's registered email
3. Signer enters OTP → verified → document revealed
4. OTP valid for 10 minutes, single-use

**Our Approach: Magic Link + Mandatory Email OTP**

For government healthcare contracts, a magic link alone is insufficient — anyone with access to the email thread could sign. We implement a **two-step identity challenge**:

1. **Magic Link** (Step 1): Signer clicks the signed URL in the invitation email → token verified → landing page shown with the signer's name and organization pre-filled
2. **Email OTP** (Step 2): System sends a 6-digit OTP to the signer's **registered contact email** (the email on file for this vendor, not the email the link was forwarded to) → signer enters OTP → verified → full document revealed

This establishes **Authority to Bind**: the signer is verified as the person who controls the vendor's registered contact email — the same person the clinic designated as their authorized signer. This is critical for government contracts where signing authority must be provable.

**OTP specifications:**
- 6-digit numeric code
- Sent via SES to the vendor's registered contact email only
- Valid for 10 minutes, single-use
- 3 attempts maximum before lockout (30-minute cooldown)
- OTP verification logged as `IDENTITY_VERIFIED` audit event with IP, timestamp, attempts count

**Why not just a magic link?**
- Magic links can be forwarded to unauthorized people
- In government contracting, the **biggest risk isn't the signature's math — it's the signer's authority**
- The OTP proves the person signing is the one who controls the registered contact channel
- This satisfies the "attribution" requirement under both ESIGN Act and UETA

**Why not Cognito login for vendors?**
- Vendors shouldn't need to create an account to sign one document
- Account creation adds friction that reduces signing completion rates
- The OTP provides equivalent identity verification without account overhead

### 2.3 Contract Termination Workflow

Active BAAs may be terminated before expiration. The system must handle this cleanly:

**Trigger conditions:**

- Covered entity terminates due to vendor breach
- Vendor ceases operations
- Mutual agreement to end the relationship
- Regulatory action

**Data model additions:**

```typescript
terminationDate: string | null;     // ISO 8601 — when the contract was terminated
terminationReason: string | null;   // Structured reason: "breach" | "mutual" | "vendor_closure" | "regulatory" | "other"
terminationNotes: string | null;    // Free-text explanation
terminatedBy: string | null;        // Who initiated termination
```

**Workflow:**

1. Admin initiates termination from the contract detail panel
2. System prompts for: reason (dropdown), notes (free text), effective date
3. Audit event: `CONTRACT_TERMINATED` logged with all termination metadata
4. BAA status changes to `terminated` (new status value)
5. **The signed PDF stays in S3 for the full 10-year retention period** — termination does not trigger deletion
6. The dashboard shows the contract as "Terminated" with a distinct visual indicator (gray, not red — red is for expired)
7. Vendor is notified via email of the termination
8. PHI handling obligations survive termination per standard BAA clause

**Important:** A terminated BAA is NOT the same as an expired BAA. Termination is an active decision; expiration is passive. Both require the vendor to return or destroy PHI, but termination may trigger additional breach notification obligations.

### 2.4 Counter-Signature Workflow

BAAs are bilateral contracts requiring signatures from both parties:

1. **Covered Entity (Clinic)** approves and sends the BAA
2. **Business Associate (Vendor)** signs first via the `/sign/[baaId]` page
3. **Covered Entity** counter-signs to fully execute the agreement

The system tracks signing status as:

- `pending_vendor_signature` — Sent to vendor, awaiting their signature
- `pending_countersignature` — Vendor signed, awaiting clinic counter-signature
- `fully_executed` — Both parties have signed; contract is active

### 2.5 "Decline to Sign" Workflow

Per ESIGN Act requirements, signers must have the ability to refuse electronic signing:

- A "Decline to Sign" button is presented alongside the signature area
- If clicked, the system prompts for a reason (free text + optional predefined reasons)
- The decline event is logged with reason, timestamp, and IP address
- The BAA status changes to `declined`
- The clinic admin is notified via email
- The signer is informed they may request a paper copy

---

## 3. Document Generation Architecture

### 3.1 PDF Generation Timing

The timing of PDF generation is critical for legal integrity:

| Phase                  | What Happens                                                        | Why                                                                     |
| ---------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Page Load**    | Generate a "Draft PDF" from the BAA template + current vendor data  | Allows signer to download and review the exact document before signing  |
| **Pre-Sign**     | Compute SHA-256 hash of the draft PDF                               | Establishes the document fingerprint BEFORE signing                     |
| **Post-Sign**    | Create "Final PDF" by overlaying the signature onto the exact draft | Ensures the signed document is a flattened version of what was reviewed |
| **Verification** | Compare final PDF hash against stored hash                          | Proves the document was not modified between review and signing         |

### 3.2 Signature Block Structure

The signature is not simply an image at the bottom. Each signature block contains:

```
┌──────────────────────────────────────────┐
│                                          │
│  [Signature Image — 2x/3x resolution]   │
│                                          │
│  ─────────────────────────────────────   │
│  Name (Printed):  Robert Kline           │
│  Title:           Chief Privacy Officer  │
│  Organization:    ScriptGuard Rx         │
│  Date (UTC):      March 25, 2026 14:32  │
│  Method:          Drawn Electronic Sig.  │
│                                          │
│  Document ID: BAA-007-v1                 │
│  Hash: a3f2...9d1e (SHA-256, first 8)   │
└──────────────────────────────────────────┘
```

### 3.3 Signature Image Capture

- Canvas captures at **2x or 3x device pixel ratio** to avoid blurry signatures in the PDF
- Image format: PNG with transparent background
- Stored as: base64 data URL on the client, converted to Buffer on the server
- Embedded in the PDF via `@react-pdf/renderer` Image component within the signature block View container

**PDF Embedding — DPI & Layout Handling:**

When embedding a high-DPI canvas capture into `@react-pdf/renderer`, the image can shift or pixelate if dimensions aren't constrained:

```tsx
// CORRECT: Fixed dimensions with object-fit containment
<View style={{ width: 200, height: 60, overflow: 'hidden' }}>
  <Image
    src={signatureBase64}
    style={{
      width: 200,
      height: 60,
      objectFit: 'contain',  // Prevents stretching/distortion
      objectPosition: 'left center',
    }}
  />
</View>
```

**Rules:**

- Always set **fixed width and height** on both the container View and the Image
- Use `objectFit: 'contain'` — never `cover` or `fill` (a large drawn signature should shrink, not overflow)
- Set `overflow: 'hidden'` on the container to prevent layout breaks if the image somehow exceeds bounds
- The canvas should export at **exactly 2x the display dimensions** (e.g., if the on-screen canvas is 400x120px, export at 800x240px). Do not go higher than 3x — diminishing returns and larger file sizes
- Test with both small (initials) and large (full cursive name) signatures to verify layout stability

### 3.4 PDF Format

- Target format: **PDF/A-2b** (ISO 19005-2) for long-term archival
- All fonts embedded (no external dependencies)
- Document renders identically regardless of viewer software or date viewed
- Ensures readability for the full 6-10 year retention period

---

## 4. Digital Fingerprinting & Integrity Verification

### 4.1 SHA-256 Document Hashing

Every signed document has a cryptographic fingerprint:

```
┌─────────────────────────────────────────────────────┐
│  1. Generate final PDF buffer (with signature)      │
│  2. Compute: SHA-256(pdfBuffer) → 256-bit digest    │
│  3. Store digest in DynamoDB (signedDocumentHash)    │
│  4. On every retrieval:                             │
│     a. Fetch PDF from S3                            │
│     b. Recompute SHA-256                            │
│     c. Compare to stored hash                       │
│     d. If mismatch → SECURITY ALERT                 │
└─────────────────────────────────────────────────────┘
```

**Regulatory basis:** 45 CFR 164.312(c)(1)-(2) requires integrity controls and mechanisms to verify ePHI has not been improperly altered.

### 4.2 AWS KMS Digital Signing

For non-repudiation (proving the document was signed at a specific time by a specific entity), the SHA-256 hash is additionally signed using AWS KMS:

```
AWS KMS Signing Flow:
  1. Compute SHA-256 hash of the PDF
  2. Call kms:Sign(KeyId, Hash, SigningAlgorithm=RSASSA_PKCS1_V1_5_SHA_256)
  3. Store the returned signature blob in DynamoDB
  4. Store the KMS Key ARN for verification reference

Verification:
  1. Fetch PDF from S3, recompute SHA-256
  2. Call kms:Verify(KeyId, Hash, Signature, SigningAlgorithm)
  3. KMS returns true/false

Alternatively (offline verification):
  1. Export public key: kms:GetPublicKey(KeyId)
  2. Verify signature using OpenSSL or any crypto library
```

**KMS Key Configuration:**

- Key type: Asymmetric — ECC_NIST_P256 (recommended)
- Key usage: SIGN_VERIFY
- Key alias: `alias/hipaa-baa-document-signing`
- Key policy: restricted to the signing service's IAM role
- Key rotation: Manual (asymmetric keys); version-track via alias
- FIPS 140-2 Level 3 validated HSMs (inherent with KMS)

### 4.3 Integrity Verification Schedule

| When                         | Action                                    | Alert If Failed                                 |
| ---------------------------- | ----------------------------------------- | ----------------------------------------------- |
| Every PDF retrieval/download | Recompute hash, compare to DB             | Immediate — "Document Tampered" security alert |
| Daily (scheduled Lambda)     | Spot-check random 10% of signed documents | Email to HIPAA officer                          |
| On audit packet generation   | Verify all included documents             | Block packet generation, flag in report         |

---

## 5. Storage Architecture

### 5.1 S3 Bucket Structure

```
hipaapotamus-signed-documents/
├── signatures/
│   ├── baa-001.png           # Raw drawn signature image
│   ├── baa-002.png
│   └── ...
├── signed-documents/
│   ├── baa-001-v1.pdf        # Immutable signed BAA
│   ├── baa-002-v1.pdf
│   ├── baa-002-v2.pdf        # Renewal version
│   └── ...
├── certificates/
│   ├── baa-001-v1-cert.pdf   # Certificate of Completion
│   └── ...
└── drafts/
    ├── baa-007-draft.pdf     # Pre-sign draft (temporary)
    └── ...
```

### 5.2 S3 Object Lock Configuration

Per AWS Healthcare Lens (HCL_SEC7) and HIPAA retention requirements:

```
S3 Object Lock:
  Mode:      Governance (allows override with s3:BypassGovernanceRetention)
             → Use Compliance mode in production (no override possible)
  Retention: 6 years minimum (default)
             10 years for Mississippi DOH records vendors
  Scope:     Applied to signed-documents/ and certificates/ prefixes

Bucket Policy:
  - Deny s3:DeleteObject on signed-documents/* (all principals)
  - Deny s3:PutObject if not encrypted (require x-amz-server-side-encryption)
  - Deny non-SSL access (aws:SecureTransport = false)
```

### 5.3 Encryption

| Layer                        | Method                 | Configuration                            |
| ---------------------------- | ---------------------- | ---------------------------------------- |
| **At rest (S3)**       | SSE-KMS (AES-256)      | AWS KMS managed key for the bucket       |
| **At rest (DynamoDB)** | AWS-managed encryption | Enabled by default                       |
| **In transit**         | TLS 1.2+               | Enforced by AWS SDK and S3 bucket policy |
| **Document signing**   | KMS asymmetric key     | ECDSA or RSA, FIPS 140-2 Level 3         |

### 5.4 Retention Policy

| Document Type             | Retention Period          | Basis                                                 |
| ------------------------- | ------------------------- | ----------------------------------------------------- |
| Signed BAA PDF            | 10 years from termination | Mississippi Code 41-9-69 (longer than HIPAA's 6-year) |
| Signature images          | Same as BAA               | Part of the signing evidence                          |
| Certificate of Completion | Same as BAA               | Audit trail evidence                                  |
| Draft PDFs                | 30 days                   | Temporary; deleted after signing or expiration        |
| Audit logs (DynamoDB)     | 10 years                  | Matches document retention                            |

---

## 6. Data Model

### 6.1 BAA Record (DynamoDB)

```typescript
interface BAA {
  // ... existing fields ...

  // Contract Termination
  terminationDate: string | null;          // ISO 8601 — when terminated (null if not terminated)
  terminationReason: 'breach' | 'mutual' | 'vendor_closure' | 'regulatory' | 'other' | null;
  terminationNotes: string | null;         // Free-text explanation
  terminatedBy: string | null;             // Who initiated termination

  // Document Signing Fields
  signedDocumentUrl: string | null;        // S3 key: signed-documents/baa-001-v1.pdf
  signedDocumentHash: string | null;       // SHA-256 hex digest of the signed PDF
  kmsSignature: string | null;             // Base64 KMS signature blob
  kmsKeyArn: string | null;               // ARN of the KMS key used for signing

  // Signing Ceremony Evidence
  signingCertificate: SigningCertificate | null;
  signedSnapshot: SignedSnapshot | null;   // Frozen contract data at signing time

  // Document Versioning
  documentVersion: number;                 // 1, 2, 3...
  parentBaaId: string | null;             // Links amendments/renewals
  versionType: 'original' | 'amendment' | 'renewal' | 'extension';
}

interface SigningCertificate {
  signerName: string;
  signerEmail: string;
  signerTitle: string;                     // Job title (required, validated — see below)
  signerOrganization: string;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;                       // ISO 8601 UTC
  consentGrantedAt: string;               // When e-sign consent checkbox was checked
  documentPresentedAt: string;            // When the document was first displayed
  method: 'drawn_signature' | 'typed_name' | 'click_to_accept';
  // Job Title Validation:
  // Government contracts require a legitimate professional title.
  // Reject: "N/A", "User", "Test", "None", single characters, numbers-only
  // Minimum: 2 words OR a recognized title pattern (e.g., "CEO", "CTO", "Director")
  // Regex: /^(?!.*(n\/a|none|test|user))[a-zA-Z\s.,'-]{3,}$/i

  draftDocumentHash: string;              // SHA-256 of the draft PDF shown to signer
  finalDocumentHash: string;              // SHA-256 of the signed PDF
}

interface SignedSnapshot {
  vendorName: string;
  vendorAddress: string;
  vendorContactName: string;
  vendorContactEmail: string;
  clinicName: string;
  clinicAddress: string;
  clinicHipaaOfficer: string;
  effectiveDate: string;
  expirationDate: string;
  contractType: string;
  templateVersion: string;
  termYears: number;
}
```

### 6.2 Signing Audit Events (DynamoDB)

Every step of the signing ceremony produces an audit record:

| Event                     | Trigger                        | Data Captured                                           |
| ------------------------- | ------------------------------ | ------------------------------------------------------- |
| `MAGIC_LINK_ACCESSED`   | Signer clicks email link       | baaId, tokenValid (bool), IP, userAgent                 |
| `OTP_SENT`              | OTP dispatched to registered email | baaId, recipientEmail (masked), timestamp           |
| `OTP_VERIFIED`          | Signer enters correct OTP      | baaId, signerEmail, attemptsUsed, IP                    |
| `OTP_FAILED`            | Wrong OTP entered              | baaId, signerEmail, attemptsUsed, IP                    |
| `OTP_LOCKED_OUT`        | 3 failed attempts              | baaId, signerEmail, lockoutUntil, IP                    |
| `DOCUMENT_PRESENTED`    | Document revealed after OTP    | baaId, viewerIP, userAgent, timestamp                   |
| `DRAFT_DOWNLOADED`      | Signer clicks "Download Draft" | baaId, viewerIP, timestamp                              |
| `ESIGN_CONSENT_GRANTED` | Checkbox checked               | baaId, signerEmail, timestamp                           |
| `SIGNATURE_CAPTURED`    | Canvas submitted               | baaId, method (drawn/typed), timestamp                  |
| `DOCUMENT_SIGNED`       | Signature processing complete  | baaId, signerName, title, hash, kmsKeyArn               |
| `DOCUMENT_STORED`       | PDF uploaded to S3             | baaId, s3Key, hash, retentionPeriod                     |
| `CONFIRMATION_SENT`     | Emails dispatched              | baaId, recipients[], messageIds[]                       |
| `DOCUMENT_VIEWED`       | PDF preview opened             | baaId, viewerEmail, viewerIP                            |
| `DOCUMENT_DOWNLOADED`   | PDF download triggered         | baaId, downloaderEmail, downloaderIP                    |
| `INTEGRITY_CHECK`       | Hash verification performed    | baaId, result (pass/fail), computedHash                 |
| `DECLINE_TO_SIGN`       | Signer declines                | baaId, signerEmail, reason, timestamp                   |
| `CONTRACT_TERMINATED`   | Admin terminates contract      | baaId, terminatedBy, reason, notes, effectiveDate       |
| `COUNTER_SIGNATURE`     | Clinic counter-signs           | baaId, counterSignerName, counterSignerTitle, timestamp |

---

## 7. Certificate of Completion

The Certificate of Completion (CoC) is a separate PDF generated after all signatures are collected. It serves as the legally defensible proof of the signing ceremony.

### 7.1 Contents

```
╔══════════════════════════════════════════════════════╗
║       CERTIFICATE OF COMPLETION                      ║
║       HIPAApotamus Electronic Signing Service        ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  Document:    Business Associate Agreement           ║
║  Document ID: BAA-007-v1                             ║
║  Template:    v1.0.0                                 ║
║                                                      ║
║  SHA-256 Hash:  a3f2c8d1...9e4b (full 64 chars)     ║
║  KMS Key ARN:   arn:aws:kms:us-east-1:119...        ║
║  KMS Signature: [Base64 truncated for display]       ║
║                                                      ║
║  ──────────────── SIGNING EVENTS ──────────────────  ║
║                                                      ║
║  Mar 25, 2026 14:28:03 UTC  Document Presented       ║
║    IP: 72.14.0.1 | UA: Chrome/122 macOS             ║
║                                                      ║
║  Mar 25, 2026 14:30:15 UTC  E-Sign Consent Granted   ║
║    IP: 72.14.0.1                                     ║
║                                                      ║
║  Mar 25, 2026 14:31:42 UTC  Signature Captured       ║
║    Method: Drawn Electronic Signature                ║
║    IP: 72.14.0.1                                     ║
║                                                      ║
║  Mar 25, 2026 14:31:43 UTC  Document Signed          ║
║    Signer: Robert Kline                              ║
║    Title:  Chief Privacy Officer                     ║
║    Org:    ScriptGuard Rx                            ║
║    Email:  r.kline@scriptguardrx.com                 ║
║                                                      ║
║  Mar 25, 2026 14:31:45 UTC  Document Stored          ║
║    S3 Key: signed-documents/baa-007-v1.pdf           ║
║    Retention: 10 years (Mississippi DOH)             ║
║                                                      ║
║  Mar 25, 2026 14:31:46 UTC  Confirmation Sent        ║
║    To: r.kline@scriptguardrx.com                     ║
║    To: admin@centralmshd.gov (clinic notification)   ║
║                                                      ║
║  ────────────────── PARTIES ───────────────────────  ║
║                                                      ║
║  Covered Entity:                                     ║
║    Central Mississippi Health District               ║
║    HIPAA Officer: James Tran, J.D., CIPP/US         ║
║                                                      ║
║  Business Associate:                                 ║
║    ScriptGuard Rx                                    ║
║    Signer: Robert Kline, Chief Privacy Officer       ║
║                                                      ║
╠══════════════════════════════════════════════════════╣
║  This certificate was generated by HIPAApotamus      ║
║  and constitutes the audit trail for the above       ║
║  electronic signing event. The document integrity    ║
║  can be verified by computing the SHA-256 hash of    ║
║  the signed PDF and comparing it to the hash above,  ║
║  or by using the KMS public key to verify the        ║
║  digital signature.                                  ║
╚══════════════════════════════════════════════════════╝
```

---

## 8. Security Controls Mapping

### 8.1 AWS Healthcare Lens Alignment

| Control Question                                      | Our Implementation                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------ |
| **HCL_SEC1** — Where is health data?           | DynamoDB (BAA metadata), S3 (signed PDFs), both in us-east-1             |
| **HCL_SEC2** — Least privilege access?         | IAM role scoped per service; Cognito role-based access; S3 bucket policy |
| **HCL_SEC3** — Logging access to data?         | DynamoDB audit logs; S3 access logging; CloudTrail (to be enabled)       |
| **HCL_SEC4** — Audit log review?               | History page in UI; automated integrity checks; HIPAA Copilot can query  |
| **HCL_SEC5** — Infrastructure protection?      | CDK-managed; SCPs at org level; Cognito MFA-ready                        |
| **HCL_SEC6** — Data residency?                 | All data in us-east-1; no cross-region replication currently             |
| **HCL_SEC7** — Encryption at rest and transit? | S3 SSE-KMS, DynamoDB AWS-managed, all APIs over TLS 1.2+                 |

### 8.2 ESIGN Act Compliance Checklist

| Requirement                                  | Implementation                                            | Status               |
| -------------------------------------------- | --------------------------------------------------------- | -------------------- |
| Intent to sign                               | Drawn signature on canvas + "Sign Agreement" button click | Implemented          |
| Consent to electronic process                | Checkbox: "I agree to sign electronically"                | Implemented          |
| Association of signature with record         | Signature embedded in PDF + SHA-256 hash linking          | Implemented          |
| Record retention                             | S3 Object Lock + 10-year retention                        | Needs Object Lock    |
| Right to paper copy                          | "Decline to Sign" with paper copy option                  | Needs Implementation |
| Disclosure of hardware/software requirements | Inform signer of browser requirements                     | Needs Implementation |

### 8.3 Additional Controls (Production Readiness)

| Control                              | Tool                     | Priority |
| ------------------------------------ | ------------------------ | -------- |
| Enable AWS CloudTrail                | CloudTrail               | High     |
| Enable S3 access logging             | S3 server access logging | High     |
| Enable S3 Object Lock                | S3 Compliance mode       | High     |
| KMS key for document signing         | AWS KMS                  | High     |
| GuardDuty for threat detection       | Amazon GuardDuty         | Medium   |
| AWS Config for compliance monitoring | AWS Config               | Medium   |
| VPC endpoints for S3/DynamoDB        | VPC                      | Medium   |
| WAF for API protection               | AWS WAF                  | Medium   |

---

## 9. Implementation Status

### 9.1 Current State (MVP)

| Feature                                | Status | Notes                                                 |
| -------------------------------------- | ------ | ----------------------------------------------------- |
| Drawn signature capture (canvas)       | Done   | 1x resolution — upgrade to 2x needed                 |
| Signature stored in S3                 | Done   | `signatures/{baaId}.png`                            |
| Signed PDF generated and stored in S3  | Done   | `signed-documents/{baaId}-v{version}.pdf`           |
| Signing metadata captured              | Done   | IP, user agent, timestamp, method, consent            |
| Signed snapshot (frozen contract data) | Done   | Vendor name, dates, terms frozen at signing           |
| Audit log for signing events           | Done   | "BAA signed" event in DynamoDB                        |
| Stored PDF served on preview           | Done   | Falls back to regeneration if S3 fails                |
| Confirmation emails                    | Done   | Via SES to vendor + admin                             |
| Document versioning fields             | Done   | `documentVersion`, `parentBaaId`, `versionType` |

### 9.2 Next Phase

| Feature                                   | Priority | Effort       |
| ----------------------------------------- | -------- | ------------ |
| Magic Link + Email OTP identity challenge | High     | 3 hours      |
| Embed drawn signature image in PDF        | High     | 1 hour       |
| Add signer job title to UI + data model   | High     | 30 min       |
| SHA-256 document hashing + storage        | High     | 1 hour       |
| KMS digital signing                       | High     | 2 hours      |
| Certificate of Completion PDF             | High     | 3 hours      |
| S3 Object Lock (Governance mode)          | High     | 30 min (CDK) |
| "Decline to Sign" workflow                | Medium   | 2 hours      |
| Counter-signature workflow (clinic signs) | Medium   | 4 hours      |
| Canvas capture at 2x resolution           | Medium   | 30 min       |
| Draft PDF generation at page load         | Medium   | 2 hours      |
| Daily integrity verification Lambda       | Low      | 2 hours      |
| PDF/A format output                       | Low      | 3 hours      |

---

## 10. References

### Legal

- [ESIGN Act — 15 U.S.C. 7001](https://www.law.cornell.edu/uscode/text/15/7001)
- [Mississippi UETA — Miss. Code Ann. 75-12-1](https://law.justia.com/codes/mississippi/title-75/chapter-12/)
- [HIPAA Security Rule — 45 CFR 164.312](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C/section-164.312)
- [HIPAA Privacy Rule — 45 CFR 164.530](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-E/section-164.530)
- [HHS Sample BAA Provisions](https://www.hhs.gov/hipaa/for-professionals/covered-entities/sample-business-associate-agreement-provisions/index.html)

### AWS

- [AWS Healthcare Industry Lens (Well-Architected)](https://docs.aws.amazon.com/wellarchitected/latest/healthcare-industry-lens/healthcare-industry-lens.html)
- [Architecting for HIPAA Security and Compliance on AWS](https://docs.aws.amazon.com/whitepapers/latest/architecting-hipaa-security-and-compliance-on-aws/architecting-hipaa-security-and-compliance-on-aws.html)
- [AWS KMS Developer Guide — Digital Signing](https://docs.aws.amazon.com/kms/latest/developerguide/signing-overview.html)
- [S3 Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html)
- [AWS Shared Responsibility Model](https://aws.amazon.com/compliance/shared-responsibility-model/)

### Standards

- [NIST SP 800-177 — Trustworthy Email](https://csrc.nist.gov/publications/detail/sp/800-177/rev-1/final)
- [SOC 2 Trust Services Criteria](https://us.aicpa.org/interestareas/frc/assuranceadvisoryservices/socforserviceorganizations)
- [PDF/A (ISO 19005)](https://www.iso.org/standard/57229.html)

### Industry

- [HIPAA Journal — E-Signatures Under HIPAA](https://www.hipaajournal.com/can-e-signatures-be-used-under-hipaa-rules-2345/)
- [Accountable HQ — HIPAA-Compliant Electronic Signatures](https://www.accountablehq.com/post/hipaa-compliant-electronic-signatures-requirements-ueta-esign-alignment-and-baa-checklist)
- [DocuSign — ESIGN Act and UETA](https://www.docusign.com/products/electronic-signature/learn/esign-act-ueta)
