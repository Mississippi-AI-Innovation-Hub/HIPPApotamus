# Setup Guide — HIPAApotamus

> This PoC runs in a sandbox environment. A live AWS account is required.

## Prerequisites

- **Node.js** 20 or later
- **npm** (bundled with Node.js)
- **AWS account** with the following services enabled:
  - Amazon Cognito (User Pool + App Client)
  - Amazon DynamoDB (single table)
  - Amazon S3 (private bucket)
  - Amazon SES (verified sender identity)
- **OpenAI API key** (GPT-4o access required for audit packet generation)
- **ElevenLabs API key** (optional — for voice notification feature)

## Step 1 — Clone

```bash
git clone https://github.com/aryalsushant/HIPAApotamus.git
cd HIPAApotamus
```

## Step 2 — Install Dependencies

```bash
npm install
```

## Step 3 — Configure Environment Variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in all values. See `.env.example` for descriptions of each variable. The minimum required set for local dev:

```
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=http://localhost:3000
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<IAM key>
AWS_SECRET_ACCESS_KEY=<IAM secret>
COGNITO_USER_POOL_ID=<pool id>
COGNITO_CLIENT_ID=<client id>
COGNITO_CLIENT_SECRET=<client secret>
COGNITO_ISSUER=https://cognito-idp.<region>.amazonaws.com/<pool-id>
DYNAMODB_TABLE_NAME=<table name>
S3_BUCKET_NAME=<bucket name>
SES_FROM_EMAIL=<verified sender>
OPENAI_API_KEY=<key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=HIPAApotamus
```

## Step 4 — Seed Demo Data (Optional)

The seed script populates DynamoDB with synthetic vendor and BAA records for demo purposes. No real data is used.

```bash
# Seed (skip existing records)
npx tsx scripts/seed.ts

# Reset and re-seed from scratch
npx tsx scripts/seed.ts --reset
```

## Step 5 — Run the Development Server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser. Log in using a Cognito user you created in the AWS Console.

## Step 6 — Verify Core Flows

1. Dashboard loads and shows BAA summary cards
2. BAA list page shows seeded vendors
3. Click a BAA → open the detail modal → verify status transitions
4. Trigger a signing link email via the "Send for Signature" action
5. Open the signing link → draw signature → submit

## AWS Setup Notes

### Cognito
- Create a User Pool with email sign-in
- Create an App Client with a client secret enabled
- Add `http://localhost:3000/api/auth/callback/cognito` as an allowed callback URL

### DynamoDB
- Create a single table with partition key `pk` (String) and sort key `sk` (String)
- Enable point-in-time recovery for any non-throwaway sandbox

### S3
- Create a private bucket (block all public access)
- The app generates pre-signed URLs server-side — no public access needed

### SES
- Verify the sender email address in SES
- In sandbox mode, also verify all recipient addresses, or request production access

## Known Setup Limitations

- SES sandbox mode requires verified recipient emails — you cannot send to arbitrary addresses without production SES access
- Cognito hosted UI is not used; Auth.js handles the OIDC flow directly
- ElevenLabs voice feature is optional and gracefully degrades if the key is absent
- CDK deployment (`cdk/`) requires `cdk bootstrap` run once per AWS account/region before first deploy
