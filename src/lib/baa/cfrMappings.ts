/**
 * CFR Clause Mapping: 45 CFR 164.504(e)(2) → MSDH BAA Sections
 *
 * Maps each required BAA element under the HIPAA Privacy Rule to the
 * specific MSDH BAA section that satisfies it. Used for:
 * - Audit-defensibility: prove clause-by-clause compliance
 * - Compliance matrix generation in audit packets
 * - Template validation (ensure no required element is missing)
 */

/**
 * Each key is a 45 CFR 164.504(e)(2) subsection.
 * Each value is the MSDH BAA section reference + summary.
 */
export const CFR_MAPPINGS: Record<string, string> = {
  // (i) Establish permitted and required uses/disclosures
  "164.504(e)(2)(i)":
    "§III.a — BA shall not Use or Disclose PHI other than as permitted by the Agreement and Underlying Agreement(s), or as Required by Law",

  "164.504(e)(2)(i)(A)":
    "§IV.a — BA may Use/Disclose PHI to perform functions for MSDH as specified in Underlying Agreement(s), provided it would not violate the Privacy Rule",

  "164.504(e)(2)(i)(B)":
    "§IV.d — BA may Use PHI to provide Data Aggregation services to MSDH per 45 C.F.R. §164.504(e)(2)(i)(B)",

  // (ii) Prohibit unauthorized uses/disclosures and require safeguards
  "164.504(e)(2)(ii)(A)":
    "§III.a — BA agrees to not Use or Disclose PHI other than as permitted or required by the Agreement",

  "164.504(e)(2)(ii)(B)":
    "§III.b — BA agrees to utilize appropriate safeguards, implement administrative/physical/technical safeguards per HIPAA Privacy and Security Rules",

  "164.504(e)(2)(ii)(C)":
    "§III.d — BA shall notify MSDH within 5 days of discovery of any Breach or Security Incident; report to MSDH Point-of-Contact, IT Security Officer, and Privacy Officer",

  "164.504(e)(2)(ii)(D)":
    "§III.e — BA shall ensure any subcontractor agrees to same restrictions and safeguards, per 45 C.F.R. §164.502(e)(1)(ii)",

  // (iii) Require individual access rights, amendment, and accounting
  "164.504(e)(2)(ii)(E)":
    "§III.f — BA shall provide access to PHI in Designated Record Set to MSDH or Individual per 45 C.F.R. § 164.524",

  "164.504(e)(2)(ii)(F)":
    "§III.h — BA shall make amendments to PHI in Designated Record Set as directed by MSDH per 45 C.F.R. § 164.526",

  "164.504(e)(2)(ii)(G)":
    "§III.g — BA shall document Disclosures and provide accounting per 45 C.F.R. §164.528; maintain records for 6 years",

  // (iv) Make books/records available to HHS
  "164.504(e)(2)(ii)(H)":
    "§III.i — BA shall make internal practices, books, and records available to the Secretary for compliance determination",

  // Termination and PHI return/destruction
  "164.504(e)(2)(iii)":
    "§VI — Term and Termination; MSDH may terminate on material breach; BA may terminate with 30-day notice on MSDH breach",

  "164.504(e)(2)(iv)":
    "§III.j, §VI.c — BA shall return or destroy all PHI upon termination; if infeasible, extend protections per §III.k and §VI.c.ii",

  // MSDH-specific provisions beyond minimum HIPAA requirements
  "MSDH.breach_5day":
    "§III.d.i — 5-day breach notification (stricter than HIPAA's 60-day floor)",

  "MSDH.breach_report_10day":
    "§III.d.v — Complete written breach report within 10 working days",

  "MSDH.encryption":
    "§III.n — AES256 or Triple DES encryption, SSL/TLS 1.2+ transport",

  "MSDH.no_offshore":
    "§III.m — No transfer of PHI outside the United States without prior written consent",

  "MSDH.its_security":
    "§III.o — Compliance with State of Mississippi ITS Enterprise Security Policy",

  "MSDH.security_audit":
    "§III.p — Executive summary of most recent security audit available on request",

  "MSDH.credit_monitoring":
    "§III.t — Minimum 12-month credit monitoring for breach-affected Individuals",

  "MSDH.indemnification":
    "§VII.e — BA indemnifies MSDH, its employees, agents, and the State of Mississippi",

  "MSDH.ms_tort_claims":
    "§VII.f — MSDH liability governed by Miss. Code Ann. § 11-46-1 et seq.",

  "MSDH.governing_law":
    "§VII.j — MS law governs; litigation in MS courts",

  "MSDH.no_sale_of_phi":
    "§III.l — BA shall not receive payment in exchange for Individual PHI without valid authorization per §164.508(a)(4)",

  "MSDH.disclosure_accounting_6yr":
    "§III.g — Maintain disclosure records for at least 6 years",
};

/**
 * Returns only the federally-required 164.504(e)(2) mappings (not MSDH-specific extras).
 */
export function getFederalMappings(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(CFR_MAPPINGS).filter(([key]) => key.startsWith("164.504")),
  );
}

/**
 * Returns only the MSDH-specific provisions that go beyond federal requirements.
 */
export function getMSDHSpecificMappings(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(CFR_MAPPINGS).filter(([key]) => key.startsWith("MSDH.")),
  );
}
