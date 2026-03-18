# HIPAApotamus

> HIPAA Business Associate Agreement (BAA) management system built for the **Mississippi Department of Health** in partnership with the AI Innovation Hub.

HIPAApotamus helps healthcare organizations track vendor contracts, automate expiration reminders, collect e-signatures, and generate AI-assisted audit packets — all in a HIPAA-conscious, audit-ready workflow.

---

## Architecture

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
│                                                              │
│  ┌───────────┐  ┌───────────┐  ┌──────────┐  ┌──────────┐  │
│  │ DynamoDB  │  │ Cognito   │  │    S3    │  │   SES    │  │
│  │ (data)    │  │ (auth)    │  │  (docs)  │  │ (email)  │  │
│  └───────────┘  └───────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS v4 |
| Auth | Auth.js v5 + Amazon Cognito |
| Database | Amazon DynamoDB (AWS SDK v3) |
| File Storage | Amazon S3 |
| Email | Amazon SES |
| AI | OpenAI API |
| Voice | ElevenLabs |
| Hosting | AWS (CDK — Milestone 10) |

---

## Local Setup

### Prerequisites

- Node.js 20+
- An AWS account with Cognito, DynamoDB, S3, and SES configured
- An OpenAI API key

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/your-org/hipaapotamus.git
cd hipaapotamus

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Edit .env.local and fill in all values (see table below)

# 4. Start the dev server
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Environment Variables

| Variable | Description | Where to get it |
|---|---|---|
| `AUTH_SECRET` | Secret for signing Auth.js session tokens | `openssl rand -base64 32` |
| `AUTH_URL` | Public URL of this app | `http://localhost:3000` in dev |
| `AWS_REGION` | AWS region for all resources | AWS Console |
| `AWS_ACCESS_KEY_ID` | IAM access key (dev only; use IAM roles in prod) | AWS IAM |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key (dev only) | AWS IAM |
| `COGNITO_USER_POOL_ID` | Cognito User Pool ID | AWS Cognito Console |
| `COGNITO_CLIENT_ID` | Cognito App Client ID | AWS Cognito Console → App clients |
| `COGNITO_CLIENT_SECRET` | Cognito App Client Secret | AWS Cognito Console → App clients |
| `COGNITO_ISSUER` | OIDC issuer URL for the User Pool | `https://cognito-idp.<region>.amazonaws.com/<pool-id>` |
| `DYNAMODB_TABLE_NAME` | Primary DynamoDB table name | AWS DynamoDB Console |
| `S3_BUCKET_NAME` | S3 bucket for BAA documents | AWS S3 Console |
| `SES_FROM_EMAIL` | Verified sender email for SES | AWS SES Console → Verified identities |
| `OPENAI_API_KEY` | OpenAI API key for AI agent | [platform.openai.com](https://platform.openai.com) |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | [elevenlabs.io](https://elevenlabs.io) |
| `ELEVENLABS_VOICE_ID` | ElevenLabs voice ID | ElevenLabs dashboard |
| `NEXT_PUBLIC_APP_URL` | Client-visible app URL | Same as `AUTH_URL` |
| `NEXT_PUBLIC_APP_NAME` | App display name | e.g. `HIPAApotamus` |

---

## Deployment

> Deployment infrastructure will be documented in **Milestone 10** using AWS CDK.

Placeholder sections:
- CDK stack location: `cdk/`
- Target: AWS App Runner or ECS Fargate
- CI/CD: GitHub Actions

---

## Security

- **No secrets are ever committed.** All credentials live in `.env.local` (gitignored) or AWS Secrets Manager in production.
- `.env.example` contains only placeholder values — never real keys.
- IAM credentials should only be used locally. In production, attach IAM roles to the compute resource directly.
- All S3 BAA documents are private and accessed via pre-signed URLs only.
- Auth is handled entirely through Amazon Cognito — passwords are never stored in the application database.

---

## License

Private — Mississippi Department of Health / AI Innovation Hub. Not for public distribution.
