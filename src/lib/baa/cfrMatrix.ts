/**
 * Compliance Matrix Generator
 *
 * Produces a structured matrix mapping each 45 CFR 164.504(e)(2) required element
 * to the MSDH BAA section that satisfies it. Used in audit packets to demonstrate
 * clause-by-clause compliance without hiring a lawyer to re-read every BAA.
 */
import type { BAA, ComplianceMatrix, ComplianceMatrixRow } from "@/types";
import { getTemplateMeta } from "./templates/registry";
import { CFR_MAPPINGS, getFederalMappings, getMSDHSpecificMappings } from "./cfrMappings";

const CFR_REQUIREMENTS: Record<string, string> = {
  "164.504(e)(2)(i)":
    "Establish the permitted and required uses and disclosures of PHI by the business associate",
  "164.504(e)(2)(i)(A)":
    "BA may use/disclose PHI only as permitted by the agreement or as required by law, to perform functions for the covered entity",
  "164.504(e)(2)(i)(B)":
    "BA may use PHI for data aggregation services relating to the health care operations of the covered entity",
  "164.504(e)(2)(ii)(A)":
    "BA shall not use or disclose PHI other than as permitted or required by the agreement",
  "164.504(e)(2)(ii)(B)":
    "BA shall use appropriate safeguards and comply with Subpart C of 45 CFR Part 164 to prevent unauthorized use/disclosure",
  "164.504(e)(2)(ii)(C)":
    "BA shall report to the covered entity any use or disclosure not provided for by the agreement, including breaches of unsecured PHI",
  "164.504(e)(2)(ii)(D)":
    "BA shall ensure that any subcontractors agree to the same restrictions and conditions",
  "164.504(e)(2)(ii)(E)":
    "BA shall make PHI available to the individual in accordance with 45 CFR 164.524 (access rights)",
  "164.504(e)(2)(ii)(F)":
    "BA shall make PHI available for amendment per 45 CFR 164.526",
  "164.504(e)(2)(ii)(G)":
    "BA shall make information available for accounting of disclosures per 45 CFR 164.528",
  "164.504(e)(2)(ii)(H)":
    "BA shall make internal practices, books, and records available to HHS for compliance determination",
  "164.504(e)(2)(iii)":
    "Authorize termination of the agreement if the covered entity determines the BA has violated a material term",
  "164.504(e)(2)(iv)":
    "BA shall return or destroy all PHI at termination; if infeasible, extend protections",

  "MSDH.breach_5day":
    "Breach notification within 5 days (stricter than HIPAA 60-day floor)",
  "MSDH.breach_report_10day":
    "Complete written breach report within 10 working days of discovery",
  "MSDH.encryption":
    "AES256 or Triple DES encryption; SSL/TLS 1.2+ for data transport",
  "MSDH.no_offshore":
    "No transfer of PHI outside the United States without written consent",
  "MSDH.its_security":
    "Compliance with State of Mississippi ITS Enterprise Security Policy",
  "MSDH.security_audit":
    "Executive summary of most recent security audit available on request",
  "MSDH.credit_monitoring":
    "Minimum 12-month credit monitoring for breach-affected individuals",
  "MSDH.indemnification":
    "BA indemnifies MSDH, employees, agents, and the State of Mississippi",
  "MSDH.ms_tort_claims":
    "MSDH liability governed by Mississippi Code Annotated § 11-46-1 et seq.",
  "MSDH.governing_law":
    "Mississippi law governs; litigation brought in Mississippi courts",
  "MSDH.no_sale_of_phi":
    "BA shall not receive payment in exchange for individual PHI without valid authorization",
  "MSDH.disclosure_accounting_6yr":
    "Maintain disclosure records for at least 6 years",
};

export function generateComplianceMatrix(baa: BAA): ComplianceMatrix {
  const templateMeta = getTemplateMeta(baa.templateVersion);
  const mappings = templateMeta?.cfrMappings ?? CFR_MAPPINGS;

  const isUploaded = baa.source === "uploaded";

  const rows: ComplianceMatrixRow[] = Object.entries(CFR_REQUIREMENTS).map(
    ([citation, requirement]) => {
      const msdhMapping = mappings[citation];
      return {
        cfrCitation: citation,
        cfrRequirement: requirement,
        msdhSection: isUploaded
          ? "Vendor-supplied document — requires manual review"
          : msdhMapping ?? "Not mapped",
        msdhSummary: isUploaded
          ? `Reviewed by ${baa.legalReviewedBy ?? "pending review"}`
          : msdhMapping ?? "No corresponding section identified",
        satisfied: isUploaded ? !!baa.legalReviewedBy : !!msdhMapping,
      };
    },
  );

  return {
    baaId: baa.id,
    templateVersion: baa.templateVersion,
    generatedAt: new Date().toISOString(),
    rows,
  };
}

/**
 * Returns only the federal (164.504) portion of the matrix.
 */
export function getFederalComplianceRows(baa: BAA): ComplianceMatrixRow[] {
  const matrix = generateComplianceMatrix(baa);
  return matrix.rows.filter((r) => r.cfrCitation.startsWith("164.504"));
}

/**
 * Returns only the MSDH-specific rows.
 */
export function getMSDHComplianceRows(baa: BAA): ComplianceMatrixRow[] {
  const matrix = generateComplianceMatrix(baa);
  return matrix.rows.filter((r) => r.cfrCitation.startsWith("MSDH."));
}
