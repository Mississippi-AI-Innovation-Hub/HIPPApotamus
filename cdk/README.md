# HIPAApotamus CDK Infrastructure

AWS CDK v2 stack that provisions all cloud resources for the HIPAApotamus HIPAA BAA management system.

## Resources

| Resource | CDK Construct | HIPAA Safeguard |
|---|---|---|
| DynamoDB Table | `dynamodb.TableV2` | Encryption at rest (AWS managed), point-in-time recovery, streams for audit trail |
| S3 Bucket | `s3.Bucket` | Block all public access, encryption at rest, versioning, SSL enforced, Glacier archival after 365 days |
| Cognito User Pool | `cognito.UserPool` | Strong password policy, optional MFA (TOTP), email verification required, no self-signup |
| Secrets Manager | `secretsmanager.Secret` | API keys stored encrypted, never in environment variables or source |
| IAM Role | `iam.Role` | Least-privilege policies scoped to specific resources |

## DynamoDB Design

Single-table design with a generic `pk`/`sk` key schema and three global secondary indexes:

- **GSI1** (`GSI1PK`/`GSI1SK`) — Query patterns by entity type (e.g., all BAAs for a vendor)
- **GSI2** (`GSI2PK`/`GSI2SK`) — Secondary access patterns (e.g., all audit logs for a BAA)
- **StatusExpirationIndex** (`status`/`expirationDate`) — Efficiently query BAAs by status and expiration window

DynamoDB Streams (`NEW_AND_OLD_IMAGES`) are enabled to support downstream audit-log processing.

## Prerequisites

- Node.js 20+
- AWS CLI configured with credentials
- AWS CDK CLI: `npm install -g aws-cdk`

## Setup

```bash
cd cdk
npm install
```

## Deploy

```bash
# Synthesize the CloudFormation template (dry run)
npx cdk synth

# Show diff against deployed stack
npx cdk diff

# Deploy with parameters
npx cdk deploy \
  --parameters DynamoDBTableName=HipaaBaaTable \
  --parameters AppUrl=https://app.example.com
```

## Parameters

| Parameter | Default | Description |
|---|---|---|
| `DynamoDBTableName` | `HipaaBaaTable` | Name of the primary DynamoDB table |
| `AppUrl` | `http://localhost:3000` | Public URL of the app (used for S3 CORS) |

## Stack Outputs

| Output | Description |
|---|---|
| `TableName` | DynamoDB table name |
| `TableArn` | DynamoDB table ARN |
| `BucketName` | S3 bucket name |
| `BucketArn` | S3 bucket ARN |
| `UserPoolId` | Cognito User Pool ID |
| `UserPoolClientId` | Cognito User Pool Client ID |
| `AppRoleArn` | IAM application role ARN |

## HIPAA Compliance Mapping

### 164.312(a)(1) — Access Control
- Cognito User Pool with strong password policy, optional TOTP MFA, no self-signup
- IAM role follows least-privilege principle, scoped to specific resource ARNs

### 164.312(a)(2)(iv) — Encryption and Decryption
- DynamoDB: AWS-managed encryption at rest
- S3: SSE-S3 encryption at rest, SSL enforced for data in transit
- Secrets Manager: KMS encryption for API keys

### 164.312(b) — Audit Controls
- DynamoDB Streams capture all item-level changes
- S3 versioning preserves all document revisions
- Application-level audit log entries stored in DynamoDB

### 164.312(c)(1) — Integrity
- S3 versioning prevents data loss from overwrites
- DynamoDB point-in-time recovery enables restoration to any second within 35 days

### 164.312(d) — Person or Entity Authentication
- Cognito enforces email verification, strong passwords, and optional MFA

### 164.312(e)(1) — Transmission Security
- S3 bucket enforces SSL (enforceSSL: true)
- All AWS SDK calls use HTTPS by default

### Data Retention
- S3 lifecycle transitions objects to Glacier after 365 days (supports Mississippi 10-year retention)
- DynamoDB table and S3 bucket use RETAIN removal policy to prevent accidental deletion
