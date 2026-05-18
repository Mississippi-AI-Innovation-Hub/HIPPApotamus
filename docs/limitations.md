# Limitations — HIPAApotamus

## Disclaimer

This repository contains code and supporting materials developed as part of a Mississippi Artificial Intelligence Innovation Hub Proof of Concept project. The contents are provided for prototype demonstration purposes. They are not production ready by default and may include simplified workflows, incomplete security guardrails, placeholder integrations, or reduced controls appropriate only for a Proof-of-Concept environment.

**This software should not be used with production data or in production environments without additional architecture, security, privacy, testing, and stakeholder review.**

---

## PoC Scope Limitations

### What This PoC Demonstrates
- End-to-end BAA lifecycle management (create → sign → counter-sign → audit)
- Electronic signature capture with PDF embedding
- AI-assisted audit packet generation
- Automated email reminder system
- Role-based access (clinic admin vs. vendor)

### What Is Out of Scope

| Area | Limitation |
|---|---|
| **Multi-tenancy** | Single clinic (`clinic-mdh-001`) is hardcoded in the seed script. A production system would need full tenant isolation. |
| **HIPAA compliance attestation** | This PoC is designed with HIPAA-conscious patterns but has not undergone a formal HIPAA risk assessment or third-party audit. |
| **Production security hardening** | WAF, DDoS protection, VPC isolation, and advanced IAM controls are not configured in this PoC. |
| **Key Management Service (KMS) signing** | The architecture document describes KMS digital signature integration; this is partially implemented and not fully production-hardened. |
| **Accessibility** | The UI has not undergone a formal WCAG 2.1 accessibility audit. |
| **Load testing** | No performance or load testing has been conducted. DynamoDB capacity is set for demo-scale traffic only. |
| **Disaster recovery** | No DR runbook or cross-region replication is configured. |
| **Real email delivery** | SES is configured in sandbox mode; real-world delivery requires SES production access and domain verification. |
| **Audit log immutability** | Audit logs are stored in DynamoDB but have not been configured with DynamoDB Streams → CloudWatch Logs for immutable retention. |

## Known Issues

- The CDK deployment stack (`cdk/`) was developed through the PoC timeline and may require updates before a fresh deploy
- The seed reset command (`--reset`) performs a full table scan and may time out on large datasets
- SES sandbox restrictions apply — recipient emails must be pre-verified in sandbox environments

## Future Work (Not Implemented)

- Multi-clinic tenant support
- Full KMS cryptographic signing ceremony
- FHIR integration for direct health system connectivity
- Admin role management and user provisioning UI
- Automated compliance reporting dashboard
