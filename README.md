# HIPAApotamus

> HIPAA Business Associate Agreement (BAA) management system built for the **Mississippi Department of Health** in partnership with the Mississippi AI Innovation Hub.

This repository contains the code and documentation for an AI Innovation Hub Proof of Concept focused on HIPAA BAA compliance management. The PoC was developed to explore whether an AI-assisted workflow could help the Mississippi Department of Health track vendor contracts, automate expiration reminders, collect e-signatures, and generate audit-ready documentation — all in a HIPAA-conscious prototype environment. The project demonstrates feasibility within a limited prototype scope and is not a production-ready solution.

---

## Agency Problem

The Mississippi Department of Health manages Business Associate Agreements with dozens of vendors who handle protected health information. Tracking contract expiration dates, collecting signatures, sending reminders, and assembling audit packets is a time-intensive manual process. Missed or expired BAAs create compliance exposure under HIPAA 45 CFR 164.504(e).

---

## PoC Scope and Demonstrated Capabilities

| Capability | Status |
|---|---|
| BAA lifecycle tracking (create → sign → counter-sign → executed) | Demonstrated |
| Vendor e-signature collection via email link | Demonstrated |
| PDF generation and secure document storage (S3) | Demonstrated |
| Automated expiration reminder emails (90/30/7 days) | Demonstrated |
| AI-generated audit packet summarization (OpenAI GPT-4o) | Demonstrated |
| Role-based access (clinic admin vs. vendor signing) | Demonstrated |
| Cryptographic document audit trail (SHA-256 hash per signing event) | Demonstrated |
| MSDH 164.504(e)(2) BAA template compliance matrix | Demonstrated |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser / Client                      │
│              Next.js 15 App Router (React 19)                │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────┐
│                    Next.js Server (App Router)                │
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

**Tech Stack**

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS v4 |
| Auth | Auth.js v5 + Amazon Cognito |
| Database | Amazon DynamoDB (AWS SDK v3) |
| File Storage | Amazon S3 |
| Email | Amazon SES |
| AI | OpenAI API (GPT-4o) |
| Infrastructure | AWS CDK (TypeScript) |

See [`docs/architecture.md`](docs/architecture.md) for the full architecture and signing ceremony data flow.

---

## Repository Structure

```
HIPAApotamus/
├── README.md
├── LICENSE
├── CHANGELOG.md
├── .env.example          # Placeholder config — fill in with your own values
├── docs/
│   ├── architecture.md   # System architecture and signing flow
│   ├── setup.md          # Setup and deployment instructions
│   ├── testing.md        # Validation notes and test results
│   ├── data-notes.md     # Data publication guidance
│   ├── limitations.md    # PoC scope limits and disclaimer
│   ├── images/           # Architecture diagrams and screenshots
│   └── ELECTRONIC_SIGNATURE_ARCHITECTURE.md  # Detailed e-sig architecture
├── src/
│   ├── app/              # Next.js App Router pages and API routes
│   ├── components/       # React UI components
│   ├── lib/              # AWS clients, auth, AI, PDF, email utilities
│   └── types/            # TypeScript type definitions
├── cdk/                  # AWS CDK infrastructure stack
├── scripts/
│   ├── seed.ts           # Synthetic demo data seeder
│   └── reset.ts          # Database reset utility
└── demos/
    └── screenshots/      # UI screenshots for documentation
```

---

## Setup

See [`docs/setup.md`](docs/setup.md) for full instructions. Quick start:

```bash
git clone https://github.com/aryalsushant/HIPAApotamus.git
cd HIPAApotamus
npm install
cp .env.example .env.local
# Fill in .env.local with your AWS and API credentials
npm run dev
```

The app runs at `http://localhost:3000`.

---

## Configuration

All configuration is through environment variables. Copy `.env.example` to `.env.local` and fill in the values. Required variables:

| Variable | Purpose |
|---|---|
| `AUTH_SECRET` | Auth.js session signing key |
| `AWS_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | AWS SDK credentials |
| `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` / `COGNITO_CLIENT_SECRET` / `COGNITO_ISSUER` | Cognito auth |
| `DYNAMODB_TABLE_NAME` | DynamoDB table name |
| `S3_BUCKET_NAME` | S3 bucket for signed documents |
| `SES_FROM_EMAIL` | Verified SES sender address |
| `OPENAI_API_KEY` | OpenAI key for audit packet generation |

Never commit real credentials. Use IAM roles in production instead of static access keys.

---

## Data Notes

This repository does not include real data. Any included datasets are placeholder samples or illustrative only.

The `scripts/seed.ts` script populates DynamoDB with fully synthetic vendor and BAA records for demonstration purposes. No real Mississippi Department of Health data, patient records, or protected health information is included anywhere in this repository.

See [`docs/data-notes.md`](docs/data-notes.md) for full details.

---

## Usage

1. Start the dev server: `npm run dev`
2. Log in at `http://localhost:3000` using a Cognito user
3. Seed demo data: `npx tsx scripts/seed.ts`
4. From the dashboard: create a BAA, send it for signature, complete the signing flow, then generate an audit packet

Core user flows are documented in [`docs/testing.md`](docs/testing.md).

---

## Testing and Evaluation

The PoC was validated through manual functional testing against a live AWS sandbox environment using synthetic data. Core flows tested:

- BAA creation → vendor signing → counter-signature → fully-executed PDF
- Reminder email delivery (manual trigger; cron via EventBridge)
- AI audit packet generation (single and multi-BAA)
- Auth flow (Cognito OIDC → session → protected routes)

No automated test suite was implemented in this PoC. See [`docs/testing.md`](docs/testing.md) for full validation notes and known gaps.

---

## Limitations

This PoC was developed within a limited timeline and controlled environment. It may contain simplified workflows, mock integrations, limited testing coverage, and prototype user interfaces.

Key out-of-scope items: multi-tenancy, formal HIPAA risk assessment, WAF/VPC security hardening, and WCAG accessibility audit.

See [`docs/limitations.md`](docs/limitations.md) for the full list.

---

## Disclaimer

This repository contains code and supporting materials developed as part of a Mississippi Artificial Intelligence Innovation Hub Proof of Concept project. The contents are provided for prototype demonstration purposes. They are not production ready by default and may include simplified workflows, incomplete security guardrails, placeholder integrations, or reduced controls appropriate only for a Proof-of-Concept environment.

**This software should not be used with production data or in production environments without additional architecture, security, privacy, testing, and stakeholder review.**

---

## License

MIT License — see [`LICENSE`](LICENSE) for full terms.

---

## Contributors

- Sushant Aryal
- Bipul Adhikari
- Prastab Ghimire
- Jeevan Karki

Developed in partnership with the **Mississippi AI Innovation Hub** and the **Mississippi Department of Health**.
