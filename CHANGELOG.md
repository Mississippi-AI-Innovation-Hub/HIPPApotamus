# Changelog — HIPAApotamus

All notable milestones for this Innovation Hub PoC are documented here.

## [Final] — May 2026

### Added
- Audit packet generation using S3-stored signed PDF as single source of truth
- Production-grade multi-BAA packet generation with persistence
- Repository closeout documentation (architecture, setup, testing, data-notes, limitations)

## [M11–M12] — April–May 2026

### Added
- MSDH BAA template registry with 164.504(e)(2) compliance matrix
- Upload exception flow for non-standard templates
- Fully-executed BAA email delivery to both parties after counter-signature
- Counter-signature flow: preserve vendor signature during regen

## [M9–M10] — March–April 2026

### Added
- Three-loop automated reminder system (90/30/7 days) with EventBridge cron
- Manual reminder send sharing the same code path as cron
- Last-sent timestamp display on dashboard
- AI audit packet generation (OpenAI GPT-4o)
- Warning-sign treatment on dashboard for BAAs awaiting counter-signature
- CDK infrastructure stack (`cdk/`)

## [M7–M8] — February–March 2026

### Added
- Electronic signature capture (HTML canvas → PNG)
- PDF embedding of signature (pdf-lib)
- S3 upload of signed PDF (private bucket, pre-signed URLs)
- Signing ceremony: signer IP, user-agent, timestamp in audit record
- SHA-256 document hash stored alongside signed PDF reference

## [M5–M6] — January–February 2026

### Added
- BAA detail modal with status transitions
- Send-for-signature flow with token-based signing link
- Amazon SES integration for outbound email
- DynamoDB single-table schema for BAA, vendor, and audit entities

## [M3–M4] — December 2025–January 2026

### Added
- Auth.js v5 + Amazon Cognito OIDC integration
- Protected route middleware
- Dashboard with BAA summary cards
- Vendor and BAA list views

## [M1–M2] — November–December 2025

### Added
- Project scaffold: Next.js 15 App Router, TypeScript, Tailwind CSS v4
- AWS DynamoDB and S3 client setup
- Seed script with synthetic demo data
- Initial README and project structure
