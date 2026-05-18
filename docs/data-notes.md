# Data Notes — HIPAApotamus

## No Real Data Is Included

This repository does not contain any real patient data, protected health information (PHI), or Mississippi Department of Health operational records.

Any datasets included are synthetic placeholder samples generated for demonstration purposes only.

## Seed Data

The `scripts/seed.ts` script populates DynamoDB with fully synthetic vendor and BAA records:

- Vendor names, contact emails, and contract types are fabricated
- No real organizations, individuals, or contract values are represented
- The clinic ID used (`clinic-mdh-001`) is a placeholder identifier

To inspect the synthetic data schema, see `scripts/seed.ts`.

## DynamoDB Schema

The application uses a single-table DynamoDB design. Key access patterns:

| Entity | PK | SK |
|---|---|---|
| BAA record | `clinic#<clinicId>` | `baa#<baaId>` |
| Vendor | `vendor#<vendorId>` | `profile` |
| Audit log entry | `audit#<baaId>` | `event#<timestamp>` |

## Document Storage

Signed PDF documents are stored in a private S3 bucket. No documents from real signing sessions are included in this repository.

## BAA Template

The file `docs/BAA template.docx` is a sample agreement template structure for demonstration purposes. It does not contain real parties, real signatures, or real protected health information.

## What a Future Team Would Need

To run this PoC against real data, a future team would need to:
1. Configure their own AWS environment (see `docs/setup.md`)
2. Provision their own Cognito User Pool with real clinic users
3. Use the seed script as a reference for the expected data shape, replacing synthetic values with their own
4. Obtain appropriate data governance approvals before connecting to any real health system data
