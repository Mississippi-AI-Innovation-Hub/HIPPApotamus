# Architecture — HIPAApotamus

> Proof-of-Concept architecture. Not a production security attestation.

## System Overview

HIPAApotamus is a Next.js 15 application with a serverless AWS backend. All components run within AWS and are accessed through the Next.js App Router (server-side API routes).

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser / Client                      │
│              Next.js 15 App Router (React 19)                │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────┐
│                    Next.js Server (App Router)                │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Route       │  │  Auth.js v5  │  │   AI Agent Layer  │  │
│  │  Handlers    │  │  (Cognito)   │  │   (OpenAI SDK)    │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  │
└─────────┼────────────────┼───────────────────┼──────────────┘
          │                │                   │
┌─────────▼────────────────▼───────────────────▼──────────────┐
│                         AWS Services                          │
│  ┌───────────┐  ┌───────────┐  ┌──────────┐  ┌──────────┐  │
│  │ DynamoDB  │  │ Cognito   │  │    S3    │  │   SES    │  │
│  │ (data)    │  │ (auth)    │  │  (docs)  │  │ (email)  │  │
│  └───────────┘  └───────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Components

| Component | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS v4 | Dashboard UI, BAA management, signature flow |
| Auth | Auth.js v5 + Amazon Cognito | User authentication and session management |
| Database | Amazon DynamoDB | BAA records, vendor data, audit logs |
| File Storage | Amazon S3 | Signed PDF documents (pre-signed URLs only) |
| Email | Amazon SES | Reminder notifications, signing invitations |
| AI Agent | OpenAI API (GPT-4o) | Audit packet generation and compliance summarization |
| Infrastructure | AWS CDK (TypeScript) | Infrastructure-as-code in `cdk/` |

## Data Flow — BAA Signing Ceremony

```
1. Clinic admin creates BAA → stored in DynamoDB (status: pending)
2. System emails vendor with unique signing link (SES)
3. Vendor opens link → loads unsigned PDF from S3 (pre-signed URL)
4. Vendor draws signature on canvas → POSTed to /api/baas/[id]/sign
5. Server embeds signature PNG into PDF (pdf-lib)
6. Signed PDF uploaded to S3 (private bucket)
7. Audit record written to DynamoDB with:
   - SHA-256 hash of signed PDF
   - Signer IP, user-agent, timestamp
   - S3 object key
8. Counter-signature flow repeats for clinic admin
9. Fully-executed PDF stored; both parties emailed
```

## Security Design (PoC)

- All S3 documents are private; accessed only via time-limited pre-signed URLs
- No passwords stored in application database (Cognito handles auth)
- IAM credentials used locally only; production uses IAM roles on compute
- Audit trail stored in DynamoDB for every state transition
- `.env.local` / AWS Secrets Manager for all credentials — nothing committed

## Infrastructure (CDK)

The `cdk/` folder contains the AWS CDK stack for sandbox deployment. Target compute is AWS App Runner or ECS Fargate. CI/CD is via GitHub Actions.

See the full electronic signature and document management architecture detail in `docs/ELECTRONIC_SIGNATURE_ARCHITECTURE.md`.
