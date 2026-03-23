# HIPAApotamus — Full Cursor Build Plan
### Mississippi Department of Health × AI Innovation Hub — Proof of Concept

---

## HOW TO USE THIS DOCUMENT

Each milestone has:
- **What you do manually** (free, no Cursor credits burned)
- **What you give Cursor** (the exact prompt, with all context baked in)
- **Constraints** Cursor must follow (paste these INTO the prompt)
- **Verification steps** (how you know it worked before moving on)
- **Exact commit messages** (copy-paste ready)

**Rule:** Never open Cursor until the manual steps for that milestone are done.  
**Rule:** Always verify before committing. Never commit broken code.  
**Rule:** One Cursor session per milestone. Plan the full session before starting it.

---

## GLOBAL PROJECT CONSTRAINTS
> Paste this block at the top of EVERY Cursor prompt, every single time.

```
GLOBAL CONSTRAINTS — follow these in every file you generate:
- Framework: Next.js 14 with App Router (not Pages Router)
- Language: TypeScript strict mode throughout. No 'any' types.
- Styling: Tailwind CSS only. No inline styles, no CSS modules.
- AWS SDK: v3 only (@aws-sdk/*). Never use v2 (aws-sdk).
- Auth: NextAuth.js v4 with Cognito CredentialsProvider
- DB: DynamoDB via @aws-sdk/client-dynamodb and @aws-sdk/lib-dynamodb (DocumentClient)
- Secrets: All secrets via process.env only. Never hardcoded. Never in client components.
- File structure: src/app/ for routes, src/components/ for UI, src/lib/ for utilities, src/types/ for TypeScript interfaces
- API routes: All in src/app/api/*/route.ts using Next.js Route Handlers (not pages/api)
- Server vs Client: Mark client components with "use client". Default to server components.
- Error handling: Every async function must have try/catch with typed errors
- No console.log in production code. Use a logger utility.
- Commit style: Conventional Commits (feat:, fix:, chore:, docs:, infra:, seed:, test:)
- Do NOT generate .env files. Only .env.example with placeholder values.
- Do NOT generate any file that contains a real API key, password, or secret.
```

---

## MILESTONE 1 — Repo & Project Scaffolding

### What this milestone proves to stakeholders
"The team started with a clean, professional foundation following industry conventions — not a hacked-together prototype."

### Manual steps (do these yourself, no Cursor needed)
1. Create a new private GitHub repo named `hipaa-baa-manager`
2. Add a README placeholder: `# HIPAApotamus — HIPAA BAA Management System`
3. Clone locally
4. Run: `npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
5. Delete the boilerplate content from `src/app/page.tsx` (keep the file, just clear it)
6. Test it runs: `npm run dev` → should load at localhost:3000

### Cursor session 1A — Project config files
**Prompt:**
```
GLOBAL CONSTRAINTS [paste block above]

PROJECT CONTEXT:
This is HIPAApotamus, a HIPAA Business Associate Agreement (BAA) management 
system being built as a proof of concept for the Mississippi Department of 
Health in partnership with an AI Innovation Hub. It allows healthcare 
organizations to manage vendor contracts, automate email reminders, handle 
e-signatures, and generate audit packets using AI agents.

TASK: Generate the following configuration and documentation files exactly:

1. `.env.example` — include ALL of these keys with empty placeholder values and a comment explaining each one:
   NEXTAUTH_SECRET, NEXTAUTH_URL, AWS_REGION, AWS_ACCESS_KEY_ID, 
   AWS_SECRET_ACCESS_KEY, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, 
   COGNITO_CLIENT_SECRET, COGNITO_ISSUER, DYNAMODB_TABLE_NAME, 
   S3_BUCKET_NAME, SES_FROM_EMAIL, OPENAI_API_KEY, ELEVENLABS_API_KEY, 
   ELEVENLABS_VOICE_ID, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_APP_NAME

2. `.gitignore` additions — append to the existing Next.js .gitignore: 
   .env, .env.local, .env.production, cdk.out/, cdk/node_modules/, 
   coverage/, *.tfstate

3. `README.md` — full professional README with:
   - Project description (HIPAA BAA management for Mississippi DOH)
   - Architecture diagram in ASCII
   - Tech stack table
   - Local setup instructions (clone, .env.example → .env.local, npm install, npm run dev)
   - Environment variables reference table (name, description, where to get it)
   - Deployment section (placeholder, will fill in Milestone 10)
   - A "Security" section noting that no secrets are ever committed

4. `src/types/index.ts` — TypeScript interfaces for ALL domain objects:
   - Vendor (id, name, type, contactName, contactEmail, contactPhone, address, createdAt, updatedAt)
   - BAA (id, vendorId, clinicId, status: BAAStatus, effectiveDate, expirationDate, signedDate, signedBy, documentUrl, templateVersion, createdAt, updatedAt)
   - BAAStatus enum: 'active' | 'expiring_soon' | 'expired' | 'pending_signature'
   - AuditLog (id, baaId, vendorId, action, performedBy, performedAt, details, ipAddress)
   - Clinic (id, name, address, contactName, contactEmail, hipaaOfficer, npi)
   - UserRole enum: 'admin' | 'vendor'
   - SessionUser (id, email, name, role: UserRole, clinicId or vendorId)

5. `src/lib/logger.ts` — a simple logger utility that:
   - In development: console.log with timestamp and level
   - In production: structured JSON logs (for CloudWatch)
   - Exports: logger.info(), logger.warn(), logger.error(), logger.debug()

6. `CONTRIBUTING.md` — commit message conventions using Conventional Commits, 
   branch naming (feature/, fix/, infra/, docs/), PR process

Do not generate any other files. Do not modify next.config.js yet.
```

### Commits for this milestone
```
chore: initialize Next.js 14 project with TypeScript, Tailwind, App Router
chore: add .env.example with all required environment variable keys
chore: update .gitignore for AWS CDK and environment files
docs: add README with architecture overview and setup instructions
feat: add TypeScript domain interfaces for all data models
feat: add structured logger utility for dev and CloudWatch production
docs: add CONTRIBUTING.md with commit conventions and branch naming
```

### Verification
- `npm run build` passes with zero errors
- `npm run lint` passes
- `.env` is in .gitignore ✓
- No real secrets anywhere ✓

---

## MILESTONE 2 — AWS Infrastructure as Code (CDK)

### What this milestone proves to stakeholders
"The infrastructure is defined as code — reproducible, auditable, and follows AWS best practices for a HIPAA-aligned system."

### Manual steps
1. From project root: `mkdir cdk && cd cdk`
2. Run: `npx cdk init app --language typescript`
3. Install CDK dependencies: `npm install aws-cdk-lib constructs`
4. Confirm AWS CLI is configured: `aws sts get-caller-identity`
5. Note your AWS Account ID and region (e.g. us-east-1)

### Cursor session 2A — CDK stack definition
**Prompt:**
```
GLOBAL CONSTRAINTS [paste block above]

PROJECT CONTEXT: [paste same context as above]

TASK: Generate a complete AWS CDK v2 stack in TypeScript inside the /cdk directory.

FILE: cdk/lib/hipaa-baa-stack.ts

Create a single CDK stack named HipaaBaaStack that defines ALL of the following 
resources. Use aws-cdk-lib (CDK v2). Never use the old @aws-cdk/* packages.

RESOURCE 1 — DynamoDB Table:
- Use `new dynamodb.TableV2` (not the old Table construct)
- Table name: from CfnParameter so it can be environment-specific
- Partition key: pk (String)
- Sort key: sk (String)
- Billing: PAY_PER_REQUEST (on-demand, no capacity planning needed for POC)
- Encryption: AWS managed (TableEncryption.AWS_MANAGED)
- Point-in-time recovery: enabled
- Add these GSIs:
  * GSI1: pk=GSI1PK, sk=GSI1SK, ProjectionType.ALL — for querying BAAs by status
  * GSI2: pk=GSI2PK, sk=GSI2SK, ProjectionType.ALL — for querying by vendorId
  * StatusExpirationIndex: pk=status (String), sk=expirationDate (String), ALL — for finding expiring BAAs
- Enable DynamoDB Streams (NEW_AND_OLD_IMAGES) for audit trail
- Add removal policy: RETAIN for production safety

RESOURCE 2 — S3 Bucket (PDF storage):
- Bucket name: hipaa-baa-pdfs-{account}-{region}
- Block all public access: true
- Encryption: S3_MANAGED
- Versioning: enabled
- Lifecycle rule: transition to GLACIER after 365 days
- CORS: allow GET from NEXT_PUBLIC_APP_URL
- Removal policy: RETAIN

RESOURCE 3 — Cognito User Pool:
- Pool name: HipaaBaaUserPool
- Self sign-up: disabled (admin creates users only)
- Sign-in: email only
- Password policy: min 8 chars, require uppercase, lowercase, number, symbol
- MFA: optional (TOTP)
- Email verification: required
- User pool client:
  * Auth flows: ALLOW_USER_PASSWORD_AUTH, ALLOW_REFRESH_TOKEN_AUTH
  * No client secret (for Next.js server-side use, but we will use a secret)
  * Access token validity: 1 hour
  * Refresh token validity: 30 days
- Add a custom attribute: custom:role (String, mutable)
- Add a custom attribute: custom:entityId (String, mutable) — stores clinicId or vendorId

RESOURCE 4 — Secrets Manager secrets (empty, to be filled manually):
- Create a secret named HipaaBaa/OpenAIKey with description "OpenAI API Key"
- Create a secret named HipaaBaa/ElevenLabsKey with description "ElevenLabs API Key"
- Create a secret named HipaaBaa/ElevenLabsVoiceId with description "ElevenLabs Voice ID"
- These should be created as placeholders (dummy value "REPLACE_ME")

RESOURCE 5 — IAM Role for the Next.js application:
- Role name: HipaaBaaAppRole
- Trust policy: allow EC2 and ECS tasks to assume it
- Attach policies (least privilege):
  * Allow dynamodb:GetItem, PutItem, UpdateItem, DeleteItem, Query, Scan on the table ARN
  * Allow s3:GetObject, PutObject, DeleteObject on the bucket ARN/*
  * Allow ses:SendEmail, ses:SendRawEmail
  * Allow secretsmanager:GetSecretValue on the three secrets ARNs only
  * Allow cognito-idp:AdminGetUser, AdminCreateUser, AdminUpdateUserAttributes on the pool ARN

OUTPUTS — Export these CloudFormation outputs:
- TableName, TableArn
- BucketName, BucketArn  
- UserPoolId, UserPoolClientId
- AppRoleArn

Also generate:
- cdk/bin/hipaa-baa.ts — CDK app entrypoint
- cdk/cdk.json — with app: "npx ts-node --prefer-ts-exts bin/hipaa-baa.ts"

Do NOT run cdk deploy. Just generate the code.
```

### Cursor session 2B — CDK documentation
**Prompt:**
```
GLOBAL CONSTRAINTS [paste block above]

Generate cdk/README.md explaining:
1. What each resource is and why it exists
2. How to bootstrap: `cdk bootstrap aws://ACCOUNT/REGION`
3. How to deploy: `cdk deploy`  
4. How to destroy (for sandbox cleanup): `cdk destroy`
5. A table mapping each CDK resource to its HIPAA compliance purpose
   (e.g. "DynamoDB encryption at rest → HIPAA Security Rule §164.312(a)(2)(iv)")
6. How to manually set the real values in Secrets Manager after deploy:
   `aws secretsmanager update-secret --secret-id HipaaBaa/OpenAIKey --secret-string "sk-..."`
```

### Commits
```
infra: initialize AWS CDK v2 project structure
infra: define DynamoDB TableV2 with GSIs and stream for audit trail
infra: add S3 bucket with encryption, versioning, and lifecycle policy
infra: add Cognito user pool with email auth and custom role attribute
infra: add Secrets Manager placeholders for third-party API keys
infra: add least-privilege IAM role for application layer
infra: export CloudFormation outputs for all resource identifiers
docs: add CDK README with HIPAA compliance mapping and deploy instructions
```

### Verification
- `cd cdk && npm run build` — TypeScript compiles with no errors
- `npx cdk synth` — generates CloudFormation template with no errors
- Review the synth output and confirm all 5 resource types are present

---

## MILESTONE 3 — Data Layer (DynamoDB)

### What this milestone proves to stakeholders
"Data is now stored in a real, persistent, encrypted AWS database — not the browser."

### Background: DynamoDB single-table design for this app
```
Entity    | PK              | SK                    | GSI1PK        | GSI1SK
----------|-----------------|------------------------|---------------|------------------
Clinic    | CLINIC#id       | METADATA              | —             | —
Vendor    | VENDOR#id       | METADATA              | CLINIC#clinicId | VENDOR#id
BAA       | BAA#id          | METADATA              | STATUS#status  | EXPIRY#expirationDate
BAA       | VENDOR#vendorId | BAA#id                | —             | —
AuditLog  | BAA#baaId       | LOG#timestamp#logId   | —             | —
```

### Manual steps
1. Deploy the CDK stack: `cd cdk && cdk deploy`
2. Copy the TableName output from CloudFormation into your `.env.local`
3. Copy the BucketName, UserPoolId, UserPoolClientId outputs too

### Cursor session 3A — DynamoDB client and type-safe operations
**Prompt:**
```
GLOBAL CONSTRAINTS [paste block above]

PROJECT CONTEXT: [paste context]

TASK: Build the complete DynamoDB data access layer.

CONTEXT ON THE DATA MODEL:
The app uses a single DynamoDB table with the following single-table design:
[paste the table above exactly]

FILE 1: src/lib/db/client.ts
- Initialize DynamoDB DocumentClient using @aws-sdk/lib-dynamodb
- Use fromEnv() credentials (works locally with AWS_ACCESS_KEY_ID and in AWS with IAM role)
- Export a singleton `ddbClient` and `ddbDocClient`
- Read TABLE_NAME from process.env.DYNAMODB_TABLE_NAME
- Throw a descriptive error at startup if TABLE_NAME is missing

FILE 2: src/lib/db/vendors.ts
Implement these functions with full TypeScript types (import from src/types/index.ts):
- `getVendors(clinicId: string): Promise<Vendor[]>` — query GSI1 by CLINIC#clinicId
- `getVendorById(id: string): Promise<Vendor | null>` — GetItem
- `createVendor(data: Omit<Vendor, 'id'|'createdAt'|'updatedAt'>): Promise<Vendor>` — PutItem, generate UUID with crypto.randomUUID()
- `updateVendor(id: string, updates: Partial<Vendor>): Promise<Vendor>` — UpdateItem with expression
- `deleteVendor(id: string): Promise<void>` — DeleteItem

FILE 3: src/lib/db/baas.ts
- `getBAAs(clinicId: string): Promise<BAA[]>` — query all BAAs for clinic
- `getBAAById(id: string): Promise<BAA | null>`
- `getBAAsByStatus(status: BAAStatus): Promise<BAA[]>` — query StatusExpirationIndex
- `getBAAsByVendor(vendorId: string): Promise<BAA[]>` — query GSI2
- `getExpiringBAAs(daysThreshold: number): Promise<BAA[]>` — query StatusExpirationIndex, filter by date math
- `createBAA(data: Omit<BAA, 'id'|'createdAt'|'updatedAt'>): Promise<BAA>`
- `updateBAA(id: string, updates: Partial<BAA>): Promise<BAA>`
- `signBAA(id: string, signedBy: string): Promise<BAA>` — sets signedDate, updates status to 'active'
- `deleteBAA(id: string): Promise<void>`

FILE 4: src/lib/db/auditLogs.ts
- `addAuditLog(log: Omit<AuditLog, 'id'|'performedAt'>): Promise<AuditLog>`
- `getAuditLogsByBAA(baaId: string): Promise<AuditLog[]>` — query by PK=BAA#baaId, SK begins_with LOG#
- `getAuditLogsByVendor(vendorId: string): Promise<AuditLog[]>`
- `getRecentAuditLogs(limit: number): Promise<AuditLog[]>`

FILE 5: src/lib/db/clinic.ts
- `getClinic(id: string): Promise<Clinic | null>`
- `updateClinic(id: string, updates: Partial<Clinic>): Promise<Clinic>`

FILE 6: src/lib/db/index.ts
- Re-export everything from all above files for clean imports

CONSTRAINTS:
- Never use `scan` — always use `query` with an index
- All timestamps: ISO 8601 strings (new Date().toISOString())
- PK/SK values: use the prefix patterns defined in the table above
- Strip PK/SK/GSI keys before returning objects to callers (callers should only see domain types)
- All functions must have JSDoc comments
```

### Cursor session 3B — Seed script
**Prompt:**
```
GLOBAL CONSTRAINTS [paste block above]

TASK: Generate scripts/seed.ts — a one-time seed script for demo data.

This script populates the DynamoDB table with realistic demo data for 
a Mississippi Department of Health proof of concept demo.

CLINIC (1 record):
{
  id: "clinic-mdh-001",
  name: "Mississippi Department of Health — Central Region",
  address: "570 East Woodrow Wilson Ave, Jackson, MS 39216",
  contactName: "Dr. Sarah Mitchell",
  contactEmail: "s.mitchell@msdh.ms.gov", 
  hipaaOfficer: "James Tran, J.D.",
  npi: "1234567890"
}

VENDORS (5 records) — use these burner email addresses (you will provide real ones):
1. CareCloud EHR Systems — ehr vendor — email: [BURNER_EMAIL_1]
2. MedBridge Lab Solutions — laboratory services — email: [BURNER_EMAIL_2]  
3. TeleHealth Connect MS — telemedicine — email: [BURNER_EMAIL_3]
4. SecureRx Pharmacy Network — e-prescribing — email: [BURNER_EMAIL_4]
5. DataVault Health Records — records storage — email: [BURNER_EMAIL_5]

BAAs (5 records, one per vendor):
- CareCloud: status=active, effective 2024-01-15, expires 2026-01-15, signed
- MedBridge: status=expiring_soon, effective 2023-06-01, expires 2025-06-01 (45 days away), signed
- TeleHealth: status=expired, effective 2022-03-01, expires 2024-03-01, signed
- SecureRx: status=pending_signature, effective date set, no signedDate
- DataVault: status=active, effective 2024-07-01, expires 2026-07-01, signed

AUDIT LOGS (3 per BAA, realistic entries):
- "BAA created and sent to vendor"
- "Vendor opened signing link"
- "Contract signed electronically" (for signed ones)
- "Expiration reminder sent (90 days)" (for expiring one)

The script should:
- Check if data already exists before inserting (idempotent)
- Log each record created
- Be runnable with: npx ts-node scripts/seed.ts
- Accept a --reset flag that clears all data first

Also create scripts/reset.ts that deletes all records from the table.
```

### Commits
```
feat: add DynamoDB DocumentClient singleton with env validation
feat: implement vendor CRUD operations with single-table design
feat: implement BAA CRUD with status calculation and GSI queries
feat: implement audit log write and query operations
feat: implement clinic read and update operations
feat: export unified data access layer from db/index.ts
seed: add demo data seed script for Mississippi DOH proof of concept
seed: add reset script for development data management
```

### Verification
- Run `npx ts-node scripts/seed.ts` — should create all records
- Open AWS Console → DynamoDB → Explore items → confirm records exist
- Run `npx ts-node -e "import('./src/lib/db').then(db => db.getVendors('clinic-mdh-001').then(console.log))"`

---

## MILESTONE 4 — Authentication (Cognito + NextAuth)

### What this milestone proves to stakeholders
"Access is controlled. You log in as an admin or as a vendor — and you only see what you're supposed to see."

### Manual steps
1. Go to AWS Console → Cognito → your user pool
2. Create the admin test user: email=admin@msdh.ms.gov, temp password, set custom:role=admin, custom:entityId=clinic-mdh-001
3. Create 1 vendor test user: email matching one of your burner emails, custom:role=vendor, custom:entityId=vendor-001
4. Copy COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, COGNITO_CLIENT_SECRET, COGNITO_ISSUER into .env.local
5. Generate NEXTAUTH_SECRET: `openssl rand -base64 32`

### Cursor session 4A — NextAuth configuration
**Prompt:**
```
GLOBAL CONSTRAINTS [paste block above]

PROJECT CONTEXT: [paste context]

TASK: Implement complete authentication using NextAuth.js v4 with AWS Cognito.

Important architecture note: We use NextAuth with a CredentialsProvider that 
calls Cognito's USER_PASSWORD_AUTH flow server-side. This keeps all AWS SDK 
calls on the server and never exposes Cognito credentials to the browser.

IMPORTANT SECURITY NOTE from CVE-2025-29927: Middleware alone is NOT sufficient 
for auth. We must verify the session at the data access layer too, not just at 
the middleware/route level.

FILE 1: src/lib/auth/cognito.ts
- Function: `authenticateWithCognito(email, password)` using @aws-sdk/client-cognito-identity-provider
- InitiateAuthCommand with USER_PASSWORD_AUTH
- Returns { accessToken, idToken, refreshToken } or throws AuthError
- Parse the JWT idToken to extract custom:role and custom:entityId claims
- Export types: AuthTokens, CognitoUserAttributes

FILE 2: src/lib/auth/options.ts (authOptions for NextAuth)
- CredentialsProvider with email + password fields
- In authorize(): call authenticateWithCognito(), return SessionUser object
- JWT callback: persist role, entityId, accessToken into the token
- Session callback: expose role, entityId on session.user
- Pages: signIn: '/login', error: '/login'
- Session strategy: 'jwt'
- JWT maxAge: 3600 (1 hour, matching Cognito access token)

FILE 3: src/app/api/auth/[...nextauth]/route.ts
- Standard NextAuth route handler, import authOptions
- Export GET and POST

FILE 4: src/middleware.ts
- Use withAuth from next-auth/middleware
- Protect all routes matching: /dashboard/:path*, /api/vendors/:path*, /api/baas/:path*, /api/audit/:path*
- Public routes (no auth needed): /login, /api/auth/:path*, /sign/:path* (vendor signing page)
- Redirect unauthenticated users to /login

FILE 5: src/lib/auth/session.ts
- `getRequiredSession(req?)`: server-side helper using getServerSession
- Throws 401 if no session
- Returns typed SessionUser
- `requireRole(session, role)`: throws 403 if wrong role
- These MUST be called in every API route handler, not just relied on middleware

FILE 6: src/app/login/page.tsx
- Clean, professional login page
- Email + password form
- Uses signIn() from next-auth/react
- Shows loading state during login
- Shows error message on failed login ("Invalid credentials")
- Matches the teal/emerald color palette from the original app (reference: globals.css used --color-teal-600 as primary)
- Logo area at top: show app name "HIPAApotamus" and subtitle "HIPAA BAA Management"
- On success: redirect to /dashboard

FILE 7: src/app/login/loading.tsx
- Simple skeleton loading state for the login page

CONSTRAINTS:
- NEVER pass AWS credentials to the client/browser
- NEVER store the Cognito access token in localStorage
- JWT session only (not database sessions)
- The session.user type must be augmented to include role and entityId
  (add next-auth.d.ts type declaration file)
```

### Cursor session 4B — Role-based routing
**Prompt:**
```
GLOBAL CONSTRAINTS [paste block above]

TASK: Implement role-based dashboard routing.

After login, redirect based on role:
- admin role → /dashboard (full management view)
- vendor role → /dashboard/vendor (vendor-only view, limited to their own BAAs)

FILE: src/app/dashboard/layout.tsx
- Server component
- Check session with getRequiredSession()
- Render a persistent sidebar navigation
- Admin sidebar items: Dashboard, Vendors, Contracts, Reminders, Audit Packets, Settings
- Vendor sidebar items: My Contracts, Request Changes, Contact Support
- Show logged-in user's name and role badge in sidebar footer
- Show a "Sign Out" button that calls signOut()

FILE: src/app/dashboard/vendor/page.tsx
- requireRole(session, 'vendor')
- Show only the BAAs belonging to session.user.entityId
- Show contract status, effective/expiration dates
- Link to /sign/[baaId] to view and sign pending contracts

FILE: src/app/dashboard/page.tsx (placeholder for now)
- requireRole(session, 'admin')  
- Show a simple "Dashboard loading..." placeholder
- We'll fill in the real content in Milestone 6
```

### Commits
```
feat: add Cognito authentication utility with USER_PASSWORD_AUTH flow
feat: configure NextAuth with Cognito CredentialsProvider and JWT strategy
feat: add NextAuth API route handler
feat: add middleware to protect dashboard and API routes
feat: add server-side session helpers with role enforcement
feat: add login page with error handling and teal brand styling
feat: add role-based dashboard layout with sidebar navigation
feat: add vendor dashboard view limited to own contracts
chore: add next-auth TypeScript type declarations for custom session fields
```

### Verification
- Visit localhost:3000 → should redirect to /login
- Log in as admin → should reach /dashboard
- Log in as vendor → should reach /dashboard/vendor
- Try accessing /dashboard without login → should redirect to /login
- Try accessing /api/vendors without auth → should return 401

---

## MILESTONE 5 — API Routes (REST Layer)

### What this milestone proves to stakeholders
"The application has a proper, secure API — not direct database calls from the browser."

### Cursor session 5A — Vendor and BAA API routes
**Prompt:**
```
GLOBAL CONSTRAINTS [paste block above]

PROJECT CONTEXT: [paste context]

TASK: Build all REST API route handlers for vendors and BAAs.

IMPORTANT PATTERNS TO FOLLOW IN EVERY ROUTE:
1. Call getRequiredSession() at the top — return 401 if no session
2. Check role with requireRole() where needed
3. Wrap all logic in try/catch
4. Return consistent JSON error shapes: { error: string, code: string }
5. Log all errors with logger.error()
6. For admin routes: verify the clinicId in the request matches session.user.entityId
7. For vendor routes: verify the vendorId matches session.user.entityId

FILE: src/app/api/vendors/route.ts
- GET: list all vendors for the admin's clinic → calls getVendors(clinicId)
- POST: create a new vendor → calls createVendor(), then triggers welcome email, 
  then creates a new BAA record, then calls sendBAAInvitationEmail()
  → calls addAuditLog() for the creation event
  → returns 201 with the created vendor and BAA

FILE: src/app/api/vendors/[id]/route.ts
- GET: get single vendor by id
- PATCH: update vendor fields
- DELETE: delete vendor (also soft-deletes their BAAs)

FILE: src/app/api/baas/route.ts
- GET: list BAAs, supports query params: ?status=active|expiring_soon|expired|pending_signature
  and ?vendorId=xxx
- POST: create a new BAA (admin only)

FILE: src/app/api/baas/[id]/route.ts
- GET: get single BAA with full vendor details joined
- PATCH: update BAA fields (admin only)
- DELETE: delete BAA (admin only)

FILE: src/app/api/baas/[id]/sign/route.ts
- POST: sign a BAA
  → verify the caller is either an admin OR the vendor whose BAA this is
  → call signBAA(id, session.user.email)
  → addAuditLog({ action: 'BAA_SIGNED', ... })
  → send confirmation email to both admin and vendor via SES
  → return updated BAA

FILE: src/app/api/audit/route.ts
- GET: fetch audit logs, supports ?baaId=xxx
- Admin only

FILE: src/app/api/stats/route.ts
- GET: returns dashboard statistics for admin
  → total vendors, active BAAs, expiring soon count, expired count, pending count
  → call getBAAs() and calculate counts in memory (fast enough for POC)
```

### Cursor session 5B — Email service (SES)
**Prompt:**
```
GLOBAL CONSTRAINTS [paste block above]

TASK: Replace the hardcoded Gmail/Nodemailer email system with AWS SES.

FILE 1: src/lib/email/sesClient.ts
- Initialize SES client with @aws-sdk/client-ses
- Use fromEnv() credentials
- Read SES_FROM_EMAIL from process.env
- Export sesClient singleton

FILE 2: src/lib/email/templates.ts
Export these functions that return { subject: string, html: string, text: string }:

a) baaInvitationEmail({ vendorName, contactName, clinicName, baaId, signingUrl, expirationDate })
   - Professional HTML email
   - Subject: "Action Required: HIPAA Business Associate Agreement — [clinicName]"
   - Body: explains what a BAA is, why they need to sign, button linking to signingUrl
   - Plain text fallback

b) reminderEmail({ vendorName, contactName, clinicName, daysUntilExpiration, renewalUrl })
   - Subject: "HIPAA BAA Expiring in [X] Days — Action Required"
   - Urgent tone for 7-day, standard for 30/60/90

c) signedConfirmationEmail({ vendorName, clinicName, baaId, signedDate, expirationDate })
   - Subject: "BAA Signed Successfully — [vendorName]"
   - Confirmation with document reference

d) adminNotificationEmail({ event, vendorName, baaId, details })
   - Subject: "HIPAApotamus Alert: [event]"
   - Sent to the clinic's HIPAA officer on important events

FILE 3: src/lib/email/sender.ts
- `sendEmail({ to, template })` → uses SES SendEmailCommand
- Handles SES errors (bounce, throttle) gracefully
- Logs all sends with logger.info()
- In development (NODE_ENV=development): log the email content to console instead of sending
  (so we don't burn SES quota locally)

FILE 4: src/app/api/send-email/route.ts
- POST handler (replaces the old Nodemailer route)
- Admin only
- Accepts: { type: 'invitation'|'reminder'|'confirmation', baaId, recipientEmail }
- Fetches BAA and vendor from DB to build template data
- Calls sendEmail()
- Adds audit log entry
```

### Commits
```
feat: add vendor list and create API routes with session validation
feat: add vendor detail, update, and delete API routes
feat: add BAA list and create API routes with status filtering
feat: add BAA detail, update, and delete API routes
feat: add BAA signing endpoint with dual-role authorization
feat: add audit log query API route
feat: add dashboard statistics aggregation endpoint
feat: add AWS SES client and replace Nodemailer email system
feat: add HTML email templates for invitation, reminder, and confirmation
feat: add email sender utility with dev-mode logging fallback
feat: update send-email API route to use SES and audit logging
```

### Verification
- `curl -X GET localhost:3000/api/vendors` with no auth → 401
- `curl -X GET localhost:3000/api/stats` with admin session cookie → returns counts
- POST to /api/vendors with vendor data → creates vendor + BAA + triggers email log

---

## MILESTONE 6 — Dashboard UI

### What this milestone proves to stakeholders
"The interface looks and works like a real healthcare compliance tool — not a hackathon project."

### Cursor session 6A — Dashboard shell and stats
**Prompt:**
```
GLOBAL CONSTRAINTS [paste block above]

PROJECT CONTEXT: [paste context]

REFERENCE — Original color palette from globals.css:
--color-teal-600: #0d9488 (primary actions)
--color-emerald-600: #059669 (success/active)
--color-amber-500: #f59e0b (warning/expiring)
--color-red-500: #ef4444 (danger/expired)
--color-slate-800: #1e293b (dark text)

TASK: Build the admin dashboard page and components.

FILE: src/app/dashboard/page.tsx
- Server component (no "use client")
- Fetch stats from /api/stats using fetch() with no-store cache
- Pass data down to client components
- Layout: top stats row, then main content area with tabs

FILE: src/components/dashboard/StatsRow.tsx ("use client")
Four stat cards in a row:
- Total Vendors (blue)
- Active Contracts (emerald green)  
- Expiring Soon (amber, with ⚠ icon)
- Expired / Pending Action (red, with urgent badge if > 0)
Each card: large number, label, subtle trend or status indicator

FILE: src/components/dashboard/BAATable.tsx ("use client")
A filterable table of all BAAs showing:
- Vendor name and type
- Contract status badge (color-coded pill)
- Effective date, expiration date
- Days until expiration (highlighted red if < 30, amber if < 90)
- Actions: View Details, Send Reminder, Download PDF
Filter bar above table: All | Active | Expiring Soon | Expired | Pending Signature
Search bar: filter by vendor name
Clicking a row opens BAADetailsModal

FILE: src/components/dashboard/BAADetailsModal.tsx ("use client")
A slide-over panel (not a centered modal) that shows:
- Full BAA details and vendor info
- Status timeline (created → sent → signed → expiring → expired)
- Audit log entries (most recent first)
- Action buttons: Send Reminder, Download Contract PDF, Mark for Renewal
- If status=pending_signature: show "Copy Signing Link" button
- An embedded AI chat panel (collapsed by default, expand button)
  → When expanded, shows the per-contract AI chat (wired up in Milestone 7)

FILE: src/components/dashboard/VendorList.tsx ("use client")
Card grid of vendors:
- Company name, type badge, contact name
- BAA status indicator
- Last activity date
- Click → shows vendor details with their BAA history

FILE: src/components/dashboard/AddVendorModal.tsx ("use client")
2-step wizard:
Step 1: Vendor info (name, type dropdown, contact name, contact email, phone, address)
Step 2: Contract setup (select template version, set effective date, expiration date)
On submit: POST to /api/vendors → shows success toast → closes modal → refreshes table
Show a loading state during submission

FILE: src/components/ui/Toast.tsx ("use client")
Reusable toast notification:
- success (green), error (red), warning (amber), info (blue)
- Auto-dismiss after 4 seconds
- Export useToast() hook and <ToastProvider>
```

### Cursor session 6B — Reminder and audit UI
**Prompt:**
```
GLOBAL CONSTRAINTS [paste block above]

TASK: Build the Reminders tab and Audit Packet tab UI.

FILE: src/components/dashboard/ReminderScheduler.tsx ("use client")
Shows a list of upcoming reminder events:
- Query /api/baas?status=expiring_soon and expired
- For each: show vendor name, expiration date, days remaining, 
  which reminder intervals have been sent (90/60/30/7 day badges)
- "Send Now" button for manual override
- "Schedule All" button that sends all overdue reminders
- Timeline view: a horizontal bar showing where in the contract lifecycle each BAA is

FILE: src/components/dashboard/AuditPacketModal.tsx ("use client")
Modal for generating audit packets:
- Checkboxes: which vendors/BAAs to include
- Date range picker for the audit period
- Options: include contract PDFs, include audit trail, include executive summary
- "Generate Packet" button
  → POST to /api/audit/generate-packet
  → Shows progress indicator ("Generating PDFs...", "Creating ZIP...", "Ready!")
  → Download button appears when complete

FILE: src/components/dashboard/DevTools.tsx ("use client")
Collapsible panel (admin only, hidden in production if NODE_ENV=production):
- "Reset Demo Data" button → DELETE /api/dev/reset then POST /api/dev/seed
- "Export All Data" button → GET /api/dev/export → downloads JSON
- "Trigger Test Email" button → sends a test email to admin address
- Shows current environment, table name, app version

Also add these dev API routes (guarded by NODE_ENV check):
- DELETE /api/dev/reset
- POST /api/dev/seed  
- GET /api/dev/export
```

### Commits
```
feat: add dashboard stats row with color-coded BAA status counts
feat: add filterable BAA table with expiration highlighting
feat: add BAA details slide-over with audit trail and action buttons
feat: add vendor card grid with status indicators
feat: add 2-step add vendor wizard with contract setup
feat: add toast notification system with useToast hook
feat: add reminder scheduler with manual send and timeline view
feat: add audit packet generator with progress indicator
feat: add dev tools panel with reset and export (dev only)
```

### Verification
- Log in as admin → see real vendor/BAA counts from DynamoDB
- Add a new vendor → see it appear in the table, check email log in console
- Filter table by "Expiring Soon" → see only expiring BAAs
- Open BAA details → see audit log entries from seed data

---

## MILESTONE 7 — AI Agent System

### What this milestone proves to stakeholders
"This isn't just a database with a UI — it has an intelligent agent layer that can understand, explain, and act on contracts."

### Architecture of the agent system
```
User
 ↓ message
/api/chat/[context]/route.ts
 ↓ context type determines system prompt + data injection
OpenAI GPT-4 (server-side, key never leaves server)
 ↓ response (may include tool call intents)
Response streamed back to client
```

Three agent contexts:
1. `contract` — knows about one specific BAA + its audit log
2. `vendor` — knows about a vendor and all their BAAs  
3. `global` — coordinator agent, knows about all BAAs + recent activity

### Cursor session 7A — AI chat infrastructure
**Prompt:**
```
GLOBAL CONSTRAINTS [paste block above]

PROJECT CONTEXT: [paste context]

IMPORTANT: OpenAI API key must ONLY be accessed server-side via 
process.env.OPENAI_API_KEY. Never import the OpenAI client in a 
client component. Never expose the key in any API response.

TASK: Build the AI chat system.

FILE 1: src/lib/ai/openai.ts
- Initialize OpenAI client from 'openai' package
- Read key from process.env.OPENAI_API_KEY
- Throw descriptive error if key missing
- Export openaiClient singleton
- Use model: "gpt-4o" (not gpt-3.5-turbo — this is a professional demo)

FILE 2: src/lib/ai/systemPrompts.ts
Export functions that generate system prompts for each agent context:

a) contractAgentPrompt(baa: BAA, vendor: Vendor, auditLogs: AuditLog[], clinic: Clinic)
- Role: "You are a HIPAA compliance specialist assistant for [clinic.name]"
- Context: Full BAA details, vendor info, complete audit trail
- Capabilities: answer questions about this contract, explain HIPAA clauses, 
  suggest renewal actions, summarize contract status
- Constraints: Do not make up dates or facts not in the provided data.
  Always cite which section of the BAA you're referring to.

b) vendorAgentPrompt(vendor: Vendor, baas: BAA[], clinic: Clinic)
- Role: "You are a vendor portal assistant helping [vendor.name] understand their agreements"
- Context: vendor's BAAs, current status, upcoming deadlines
- Capabilities: explain what they need to sign, answer questions about BAA terms
- Constraints: Only discuss this vendor's agreements. Do not reveal other vendors.

c) coordinatorAgentPrompt(allBAAs: BAA[], vendors: Vendor[], recentLogs: AuditLog[], clinic: Clinic)
- Role: "You are the coordinator agent for [clinic.name]'s HIPAA compliance program"
- Context: Full system summary — all BAA statuses, upcoming expirations, recent activity
- Capabilities: system-wide queries, trend analysis, recommend priority actions,
  instruct on workflow changes
- Format responses with clear sections when giving summaries

FILE 3: src/app/api/chat/[context]/route.ts
- POST handler
- Validate context param: must be 'contract', 'vendor', or 'global'  
- Parse request body: { messages: ChatMessage[], contextId?: string }
- Based on context type: fetch relevant data from DynamoDB
- Build system prompt using the appropriate function above
- Call OpenAI with streaming enabled (use stream: true)
- Stream the response back using ReadableStream / TransformStream
- Log the interaction (no PII in logs) with logger.info()
- Auth: contract/global context = admin only; vendor context = vendor with matching entityId

FILE 4: src/components/chat/ChatPanel.tsx ("use client")
A reusable chat UI component:
- Props: context ('contract'|'vendor'|'global'), contextId (baaId or vendorId)
- Message list with user/assistant styling
- Input box with send button and Enter key support
- Streaming response support (append tokens as they arrive)
- Loading indicator while waiting
- Error state with retry button
- "Clear conversation" button
- Persist conversation in React state only (not localStorage)
- Teal color scheme for assistant messages, slate for user messages

FILE 5: src/components/chat/GlobalChatPanel.tsx ("use client")
The coordinator agent panel shown at bottom of dashboard:
- Floating panel, expandable/collapsible
- Persists open/closed state in React state
- Shows a pulsing indicator when the agent is "active" (has been queried recently)
- Quick prompt suggestions: "Summarize all expiring contracts", 
  "What needs attention this week?", "Show me recent activity"
```

### Cursor session 7B — ElevenLabs TTS
**Prompt:**
```
GLOBAL CONSTRAINTS [paste block above]

TASK: Add ElevenLabs text-to-speech to the agent responses.

FILE 1: src/app/api/tts/route.ts
- POST handler: { text: string }
- Admin and vendor both can use this
- Read ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID from process.env (server-side only)
- Call ElevenLabs API: POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}
- Stream the audio response back as audio/mpeg
- Rate limit: max 500 chars of text per call (trim if longer, with ellipsis)
- Log TTS calls for usage tracking

FILE 2: update ChatPanel.tsx
- Add a speaker icon button on each assistant message
- On click: POST the message text to /api/tts, receive audio blob, play with Web Audio API
- Show loading state on speaker icon while generating
- Only show speaker button on messages > 10 characters
```

### Cursor session 7C — Signing page
**Prompt:**
```
GLOBAL CONSTRAINTS [paste block above]

TASK: Build the vendor-facing contract signing page.

This page is accessible WITHOUT authentication (public route) at /sign/[baaId].
Vendors receive this link via email. They do not need a login to sign.

FILE: src/app/sign/[baaId]/page.tsx (Server Component)
- Fetch BAA and vendor data by baaId
- If BAA not found: show error page
- If BAA already signed: show "Already Signed" confirmation page
- If BAA expired: show "Contract Expired — please contact [clinic.name]"
- Otherwise: render SigningInterface client component

FILE: src/components/signing/SigningInterface.tsx ("use client")
Full-page signing experience:
Left panel (60% width): 
- Contract document viewer
- Scrollable, shows full BAA text with all variables populated
- Sections clearly delineated with headers

Right panel (40% width):
- Vendor name and clinic name at top
- Embedded AI chat (vendorAgentPrompt context)
  → Vendor can ask questions about the contract before signing
  → Chat uses /api/chat/vendor endpoint
  → Identify the vendor by a signed token in the URL (not session)
- Signature canvas (HTML canvas element)
  → Clear button
  → "Draw your signature above" instruction
- "I have read and agree to this Business Associate Agreement" checkbox
- Sign button (disabled until checkbox checked AND signature drawn)
- On sign: POST to /api/baas/[id]/sign with signature image as base64
- Post-signing: show a thank-you screen with download link for the signed PDF

FILE: src/lib/signing/token.ts
- generateSigningToken(baaId: string, vendorId: string): string 
  → HMAC-SHA256 token, expires in 72 hours, includes baaId + vendorId + expiry
- verifySigningToken(token: string): { baaId, vendorId } | null
  → Verify signature and expiry
  → Use NEXTAUTH_SECRET as the HMAC key
- Include this token in the BAA invitation email URL
- Verify it in the /api/baas/[id]/sign route for unauthenticated vendor signers
```

### Commits
```
feat: add OpenAI client with server-side key enforcement
feat: add system prompts for contract, vendor, and coordinator agents
feat: add streaming chat API routes for all three agent contexts
feat: add reusable chat panel component with streaming support
feat: add global coordinator agent panel in dashboard
feat: add ElevenLabs TTS API route with server-side key protection
feat: add voice playback button on assistant chat messages
feat: add public vendor signing page with contract viewer
feat: add signature canvas with checkbox confirmation flow
feat: add HMAC signing token for secure unauthenticated vendor access
feat: wire vendor agent chat into signing page
```

### Verification
- Open /dashboard → click a contract → expand AI chat → ask "when does this expire?" → get real answer
- Open global agent → ask "summarize all contracts" → get accurate summary
- POST to /api/tts with text → hear audio playback
- Get signing link from a vendor BAA → open it → see contract → draw signature → submit

---

## MILESTONE 8 — PDF Generation & S3 Storage

### What this milestone proves to stakeholders
"Generated documents are stored securely in the cloud and accessible on demand — this is audit-ready."

### Cursor session 8A — PDF generation
**Prompt:**
```
GLOBAL CONSTRAINTS [paste block above]

PROJECT CONTEXT: [paste context]

TASK: Build PDF generation and S3 storage system.

REFERENCE: The original pdfGenerator.js used @react-pdf/renderer. 
Keep this same library. Upgrade the PDF styles to look professional 
and appropriate for a state health department.

FILE 1: src/lib/pdf/styles.ts
PDF style constants:
- Colors matching the app (teal, emerald, slate)
- Typography: Helvetica (built-in, no font loading issues)
- Header style: clinic name, "HIPAA Business Associate Agreement", date
- Footer style: page number, "CONFIDENTIAL — HIPAA PROTECTED DOCUMENT"
- Section header styles, body text, table styles

FILE 2: src/lib/pdf/BaaContractPDF.tsx
React-PDF component for a single BAA contract:
- Header: Mississippi Department of Health seal placeholder + clinic name
- All 10 required HHS BAA elements (see BAA_REQUIRED_ELEMENTS below)
- All template variables populated from BAA + Vendor + Clinic data
- Signature block at bottom: two columns (Covered Entity | Business Associate)
  → If signed: show signedBy name and signedDate
  → If not signed: show blank signature line
- Footer with CONFIDENTIAL label and page numbers

BAA_REQUIRED_ELEMENTS (include all 10 as numbered sections):
1. Definitions (PHI, HIPAA, Business Associate, Covered Entity)
2. Permitted Uses and Disclosures of PHI
3. Prohibited Uses and Disclosures
4. Required Safeguards (administrative, physical, technical)
5. Breach Reporting Obligations (within 60 days of discovery, 24-hour internal notice)
6. Individual Rights Support (access, amendment, accounting of disclosures)
7. HHS Access to Records and Books
8. Subcontractor Requirements
9. Term and Termination (including right to terminate for material breach)
10. Effect of Termination / Return or Destruction of PHI

FILE 3: src/lib/pdf/AuditTrailPDF.tsx
React-PDF component:
- Header: clinic name, "BAA Audit Trail Report", date range
- Table of audit events: timestamp, action, performed by, details
- Grouped by BAA/vendor

FILE 4: src/lib/pdf/ExecutiveSummaryPDF.tsx
React-PDF component for the audit packet cover page:
- Clinic info, report date
- Summary statistics table
- List of all vendors with BAA status
- Compliance score visualization (just a table with percentages)

FILE 5: src/lib/pdf/generator.ts
Functions that render PDFs and return Buffer:
- `generateContractPDF(baaId: string): Promise<Buffer>`
  → fetches BAA, vendor, clinic from DB
  → renders BaaContractPDF using renderToBuffer()
  → uploads to S3 at key: pdfs/{clinicId}/contracts/{baaId}.pdf
  → returns the S3 key and presigned URL (1-hour expiry)

- `generateAuditPacket(clinicId: string, options: AuditPacketOptions): Promise<Buffer>`
  → generates ExecutiveSummaryPDF + all contract PDFs + AuditTrailPDF
  → ZIPs them using jszip
  → uploads to S3: pdfs/{clinicId}/audit-packets/{timestamp}.zip
  → returns presigned URL

FILE 6: src/lib/storage/s3.ts
S3 utilities:
- `uploadToS3(key: string, body: Buffer, contentType: string): Promise<string>` → returns S3 key
- `getPresignedUrl(key: string, expiresIn: number): Promise<string>` → uses GetObjectCommand + presigner
- `deleteFromS3(key: string): Promise<void>`

FILE 7: src/app/api/pdf/[baaId]/route.ts
- GET: generate (or retrieve cached) contract PDF, return presigned URL
- Auth: admin, or vendor whose BAA this is
```

### Commits
```
feat: add React-PDF styles matching MDH brand and HIPAA document standards
feat: add BAA contract PDF component with all 10 HHS-required elements
feat: add audit trail PDF component with chronological event table
feat: add executive summary PDF for audit packets
feat: add PDF generator with S3 upload and presigned URL retrieval
feat: add S3 utility functions for upload, presign, and delete
feat: add PDF generation API route with role-based access control
feat: add audit packet generator with ZIP export
```

### Verification
- Call GET /api/pdf/[real-baa-id] → receive a URL → open it → see a real PDF
- PDF should have all 10 BAA sections, correct vendor/clinic names
- File should appear in S3 console under pdfs/ prefix

---

## MILESTONE 9 — BAA Template (HIPAA-Accurate)

### What this milestone proves to stakeholders
"The contracts generated by this system are grounded in real HIPAA law — not placeholder text."

### Cursor session 9A
**Prompt:**
```
GLOBAL CONSTRAINTS [paste block above]

TASK: Create a legally-informed, realistic HIPAA BAA template system.

FILE 1: src/lib/baa/template.ts

Create a detailed BAA template string as a TypeScript constant. 
This template must include ALL of the following sections with realistic, 
legally-informed language (based on HHS sample at 45 CFR 164.504(e)):

The template should reference Mississippi state law where appropriate 
(Mississippi Code § 41-9-60 et seq. for medical records).

Template variables use {{DOUBLE_BRACE}} syntax:
{{BUSINESS_ASSOCIATE_NAME}}, {{COVERED_ENTITY_NAME}}, {{EFFECTIVE_DATE}},
{{TERMINATION_DATE}}, {{SERVICES_DESCRIPTION}}, {{BA_ADDRESS}},
{{CE_ADDRESS}}, {{CE_SIGNER_NAME}}, {{CE_SIGNER_TITLE}},
{{BA_SIGNER_NAME}}, {{BA_SIGNER_TITLE}}, {{SIGNATURE_DATE}}

REQUIRED SECTIONS:
1. RECITALS — why this agreement exists, reference to HIPAA 45 CFR 164.504(e)
2. DEFINITIONS — Business Associate, Covered Entity, PHI, ePHI, 
   Security Incident, Breach (use actual HIPAA definitions)
3. OBLIGATIONS OF BUSINESS ASSOCIATE
   a. Permitted uses (only for purposes in Attachment A)
   b. Non-disclosure (shall not use/disclose except as permitted or required by law)
   c. Safeguards (must implement HIPAA Security Rule requirements including 
      administrative, physical, technical safeguards)
   d. Subcontractors (must obtain BAAs with all subcontractors)
   e. PHI access (support individual rights under 45 CFR 164.524)
   f. Amendment of PHI (support 45 CFR 164.526)
   g. Accounting of disclosures (support 45 CFR 164.528)
   h. HHS access to books and records
4. BREACH NOTIFICATION
   - Business Associate shall report breach no later than 60 calendar days 
     after discovery (cite 45 CFR 164.410)
   - Internal notification within 24 hours of discovery
   - Notification must include: individuals affected, PHI involved, 
     unauthorized persons, whether PHI was acquired, mitigation steps
5. PERMITTED USES BY COVERED ENTITY
6. OBLIGATIONS OF COVERED ENTITY
7. TERM AND TERMINATION
   - Effective date, termination date
   - Termination for cause: covered entity may terminate if BA violates material term
   - 30-day cure period before termination
   - Effect of termination: BA must return or destroy all PHI
8. INDEMNIFICATION
   - BA indemnifies CE for costs arising from BA's HIPAA violations
9. MISCELLANEOUS
   - Regulatory references update automatically with HIPAA rule changes
   - Governing law: State of Mississippi
   - Entire agreement / merger clause
   - Amendment requires written consent of both parties
   - Interpretation: resolve ambiguity in favor of HIPAA compliance
10. SIGNATURE BLOCK (two columns)

Also export:
- `populateTemplate(template: string, values: Record<string, string>): string`
- `generateBAADocument(baa: BAA, vendor: Vendor, clinic: Clinic): string`
- `getTemplateVersion(): string` → returns "2025.1"
- `validateTemplatePopulation(populated: string): string[]` 
  → returns array of any {{VARIABLE}} placeholders that weren't replaced
```

### Commits
```
feat: add HIPAA-compliant BAA template with all 10 HHS-required elements
feat: add Mississippi state law references to BAA template
feat: add template population engine with validation
feat: update PDF generator to use new HIPAA-accurate template
```

---

## MILESTONE 10 — Deployment

### What this milestone proves to stakeholders
"This is live. You can access it right now from any browser with a real URL."

### Manual steps before Cursor
1. Create an AWS Amplify app in the console pointing to your GitHub repo
2. Set all environment variables in Amplify → Environment Variables
3. Verify your SES email identity (send verification to SES_FROM_EMAIL)
4. Verify the 5 burner vendor emails in SES (required for SES sandbox mode)
5. Run the seed script against production DynamoDB: `NODE_ENV=production npx ts-node scripts/seed.ts`
6. Create the admin Cognito user for the demo: admin@msdh.ms.gov

### Cursor session 10A
**Prompt:**
```
GLOBAL CONSTRAINTS [paste block above]

TASK: Set up CI/CD and deployment configuration.

FILE 1: .github/workflows/ci.yml
GitHub Actions workflow that runs on every push and PR:
- Node.js 20 setup
- npm ci
- npm run lint
- npm run build (catches TypeScript errors)
- Run type-check: npx tsc --noEmit
- Do NOT run tests (no test suite yet)
- Comment on PRs with build status

FILE 2: .github/workflows/deploy.yml
Deploy workflow that runs on push to main branch only:
- Trigger Amplify build via AWS CLI: aws amplify start-job
- Requires secrets: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AMPLIFY_APP_ID, AMPLIFY_BRANCH
- Notify on failure

FILE 3: amplify.yml (Amplify build spec in root of project)
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*

FILE 4: next.config.ts update
- Add output: 'standalone' for optimized Amplify deployment
- Add proper security headers: X-Frame-Options, X-Content-Type-Options, 
  Strict-Transport-Security, Referrer-Policy
- Add environment variable validation at build time (throw if required vars missing)

FILE 5: src/app/api/health/route.ts
Health check endpoint:
- GET: returns { status: 'ok', timestamp, version: process.env.npm_package_version }
- Check DynamoDB connectivity (simple getItem call)
- Returns 503 if DB is unreachable

FILE 6: Update README.md
- Add live demo URL (placeholder: https://YOUR-APP.amplifyapp.com)
- Add demo credentials section (admin@msdh.ms.gov / ask presenter for password)
- Add architecture diagram showing all AWS services
- Add "Built for Mississippi DOH × AI Innovation Hub" footer
```

### Commits
```
ci: add GitHub Actions workflow for lint and build validation
ci: add deployment workflow targeting AWS Amplify on main branch
chore: add Amplify build specification file
chore: configure Next.js standalone output and security headers
chore: add environment variable validation at build time  
feat: add health check API endpoint with DynamoDB connectivity test
docs: update README with live deployment URL and demo instructions
```

### Final verification checklist
- [ ] `https://YOUR-APP.amplifyapp.com` loads the login page
- [ ] Login as admin@msdh.ms.gov → see real data from DynamoDB
- [ ] Add a test vendor → email appears in SES verified inbox
- [ ] Open signing link → draw signature → sign → BAA updates to 'active'
- [ ] AI chat answers questions about a real contract
- [ ] TTS plays audio of AI responses
- [ ] Download audit packet → ZIP opens with real PDFs
- [ ] Check GitHub → no secrets in any commit
- [ ] Check AWS Secrets Manager → real API keys stored there, not in repo

---

## APPENDIX A — Cursor Credit Budget

| Milestone | Sessions | Est. Cost | Complexity |
|---|---|---|---|
| 1 — Scaffolding | 1A | $0.50 | Low |
| 2 — CDK | 2A, 2B | $1.50 | Medium |
| 3 — Data Layer | 3A, 3B | $2.50 | High |
| 4 — Auth | 4A, 4B | $2.00 | High |
| 5 — API Routes | 5A, 5B | $2.50 | High |
| 6 — Dashboard UI | 6A, 6B | $3.00 | High |
| 7 — AI Agents | 7A, 7B, 7C | $3.50 | Highest |
| 8 — PDFs | 8A | $1.50 | Medium |
| 9 — Template | 9A | $1.00 | Medium |
| 10 — Deploy | 10A | $1.00 | Low |
| **TOTAL** | **13 sessions** | **~$19** | |

## APPENDIX B — Environment Variables Reference

| Variable | Where it comes from | Used in |
|---|---|---|
| NEXTAUTH_SECRET | `openssl rand -base64 32` | NextAuth JWT encryption |
| NEXTAUTH_URL | Your Amplify URL | NextAuth redirects |
| AWS_REGION | e.g. `us-east-1` | All AWS SDK calls |
| AWS_ACCESS_KEY_ID | IAM user for local dev | Local dev only |
| AWS_SECRET_ACCESS_KEY | IAM user for local dev | Local dev only |
| COGNITO_USER_POOL_ID | CDK output: UserPoolId | NextAuth Cognito |
| COGNITO_CLIENT_ID | CDK output: UserPoolClientId | NextAuth Cognito |
| COGNITO_CLIENT_SECRET | Cognito app client settings | NextAuth Cognito |
| COGNITO_ISSUER | `https://cognito-idp.{region}.amazonaws.com/{poolId}` | NextAuth JWT |
| DYNAMODB_TABLE_NAME | CDK output: TableName | All DB operations |
| S3_BUCKET_NAME | CDK output: BucketName | PDF storage |
| SES_FROM_EMAIL | Your verified SES identity | Email sending |
| OPENAI_API_KEY | platform.openai.com | AI agents |
| ELEVENLABS_API_KEY | elevenlabs.io | TTS |
| ELEVENLABS_VOICE_ID | ElevenLabs voice library | TTS |
| NEXT_PUBLIC_APP_URL | Your Amplify URL | Email links, CORS |
| NEXT_PUBLIC_APP_NAME | `HIPAApotamus` | UI display |
