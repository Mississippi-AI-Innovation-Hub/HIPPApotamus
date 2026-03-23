/**
 * HIPAA-compliant BAA template with all 10 HHS-required elements.
 * Uses {{DOUBLE_BRACE}} variable syntax for population.
 *
 * Reference: HHS Business Associate Agreement Provisions
 * https://www.hhs.gov/hipaa/for-professionals/covered-entities/sample-business-associate-agreement-provisions/index.html
 */

const TEMPLATE_VERSION = "v1.0.0";

/**
 * Full BAA template text. Variables use {{DOUBLE_BRACE}} syntax.
 *
 * HHS Required Elements:
 * 1. Establish permitted/required uses and disclosures
 * 2. Prohibit unauthorized uses/disclosures
 * 3. Require appropriate safeguards
 * 4. Require breach reporting
 * 5. Require subcontractor compliance (if applicable)
 * 6. Make PHI available for individual access
 * 7. Make PHI available for amendment
 * 8. Provide accounting of disclosures
 * 9. Make practices/records available to HHS
 * 10. Return/destroy PHI at termination
 */
const BAA_TEMPLATE = `# BUSINESS ASSOCIATE AGREEMENT

## RECITALS AND PARTIES

This Business Associate Agreement ("Agreement") is entered into as of {{EFFECTIVE_DATE}} ("Effective Date") by and between:

**Covered Entity:** {{COVERED_ENTITY_NAME}}
Address: {{COVERED_ENTITY_ADDRESS}}
Contact: {{COVERED_ENTITY_CONTACT}}
NPI: {{COVERED_ENTITY_NPI}}
HIPAA Privacy/Security Officer: {{HIPAA_OFFICER}}

**Business Associate:** {{BUSINESS_ASSOCIATE_NAME}}
Address: {{BUSINESS_ASSOCIATE_ADDRESS}}
Contact: {{BUSINESS_ASSOCIATE_CONTACT}}

**Contract Type:** {{CONTRACT_TYPE}}
**Term:** {{TERM_YEARS}} year(s), expiring {{EXPIRATION_DATE}}

WHEREAS, Covered Entity is a covered entity as defined by the Health Insurance Portability and Accountability Act of 1996, as amended ("HIPAA"), and the Health Information Technology for Economic and Clinical Health Act ("HITECH Act");

WHEREAS, Business Associate provides services to Covered Entity that involve the use and/or disclosure of Protected Health Information ("PHI") as defined by 45 CFR 160.103;

WHEREAS, the parties desire to comply with HIPAA, the HITECH Act, and all applicable regulations promulgated thereunder, including 45 CFR Parts 160 and 164, and applicable Mississippi state privacy laws;

NOW, THEREFORE, in consideration of the mutual promises and covenants contained herein, the parties agree as follows:

## SECTION 1 — DEFINITIONS

(a) "Breach" shall have the meaning given to such term under 45 CFR 164.402.

(b) "Business Associate" shall have the meaning given to such term under 45 CFR 160.103.

(c) "Covered Entity" shall have the meaning given to such term under 45 CFR 160.103.

(d) "Designated Record Set" shall have the meaning given to such term under 45 CFR 164.501.

(e) "Electronic Protected Health Information" or "ePHI" shall have the meaning given to such term under 45 CFR 160.103.

(f) "Individual" shall have the meaning given to such term under 45 CFR 160.103 and shall include a person who qualifies as a personal representative under 45 CFR 164.502(g).

(g) "Protected Health Information" or "PHI" shall have the meaning given to such term under 45 CFR 160.103, limited to the information created, received, maintained, or transmitted by Business Associate from or on behalf of Covered Entity.

(h) "Required by Law" shall have the meaning given to such term under 45 CFR 164.103.

(i) "Secretary" shall mean the Secretary of the United States Department of Health and Human Services.

(j) "Security Incident" shall have the meaning given to such term under 45 CFR 164.304.

(k) "Unsecured Protected Health Information" shall have the meaning given to such term under 45 CFR 164.402.

## SECTION 2 — PERMITTED AND REQUIRED USES AND DISCLOSURES (HHS Element 1)

(a) Business Associate may use or disclose PHI only as permitted or required by this Agreement or as Required by Law.

(b) Business Associate is authorized to use and/or disclose PHI to perform functions, activities, or services for, or on behalf of, Covered Entity as specified in the underlying service agreement, provided that such use or disclosure would not violate the Privacy Rule if done by Covered Entity.

(c) Business Associate may use PHI for the proper management and administration of the Business Associate or to carry out the legal responsibilities of the Business Associate, provided such uses are permitted under the Privacy Rule.

(d) Business Associate may disclose PHI for the proper management and administration of the Business Associate, provided that (i) disclosures are Required by Law, or (ii) Business Associate obtains reasonable assurances from the person to whom the information is disclosed that it will remain confidential and will be used or further disclosed only as Required by Law or for the purpose for which it was disclosed, and the person notifies Business Associate of any instances of breach of confidentiality.

(e) Business Associate may use PHI to provide Data Aggregation services to Covered Entity as permitted by 45 CFR 164.504(e)(2)(i)(B).

(f) Business Associate may de-identify PHI in accordance with 45 CFR 164.514(a)-(c).

## SECTION 3 — PROHIBITED USES AND DISCLOSURES (HHS Element 2)

(a) Business Associate shall not use or disclose PHI other than as permitted or required by this Agreement or as Required by Law.

(b) Business Associate shall not use or disclose PHI in a manner that would violate Subpart E of 45 CFR Part 164 if done by Covered Entity, except for uses and disclosures permitted under Sections 2(c) and 2(d) of this Agreement.

(c) Business Associate shall not use or disclose PHI for fundraising or marketing purposes.

(d) Business Associate shall not disclose PHI to a health plan for underwriting purposes.

(e) Business Associate shall not sell PHI, as defined by 45 CFR 164.502(a)(5)(ii), without written authorization from the Individual whose PHI is at issue.

## SECTION 4 — APPROPRIATE SAFEGUARDS (HHS Element 3)

(a) Business Associate shall implement administrative, physical, and technical safeguards that reasonably and appropriately protect the confidentiality, integrity, and availability of PHI, including ePHI, that Business Associate creates, receives, maintains, or transmits on behalf of Covered Entity, in accordance with 45 CFR Part 164, Subpart C.

(b) Business Associate shall comply with the Security Rule requirements applicable to business associates under 45 CFR 164.308, 164.310, 164.312, and 164.316.

(c) Business Associate shall implement and maintain an information security program, including but not limited to: (i) encryption of ePHI at rest and in transit; (ii) access controls and authentication mechanisms; (iii) audit logging and monitoring; (iv) incident response procedures; (v) workforce training on PHI handling; and (vi) regular risk assessments.

(d) {{SOC2_REQUIREMENT}}

## SECTION 5 — BREACH NOTIFICATION (HHS Element 4)

(a) Business Associate shall report to Covered Entity any Breach of Unsecured Protected Health Information without unreasonable delay and in no event later than {{BREACH_NOTIFICATION_DAYS}} calendar days after discovery of the Breach.

(b) Business Associate shall report to Covered Entity any Security Incident of which Business Associate becomes aware. Such report shall include, to the extent known: (i) identification of each Individual whose PHI has been, or is reasonably believed to have been, accessed, acquired, used, or disclosed; (ii) a description of the nature of the Breach; (iii) a description of what PHI was involved; (iv) the date of the Breach and date of discovery; (v) recommended steps Individuals should take to protect themselves; and (vi) a description of what Business Associate is doing to investigate, mitigate, and prevent recurrence.

(c) Business Associate shall cooperate with Covered Entity in the investigation and notification obligations arising from any Breach, including complying with Mississippi breach notification law (Miss. Code Ann. 75-24-29).

(d) Business Associate agrees to cover reasonable costs associated with Breach notification, including credit monitoring for affected Individuals, to the extent the Breach resulted from Business Associate's acts or omissions.

## SECTION 6 — SUBCONTRACTORS (HHS Element 5)

(a) In accordance with 45 CFR 164.502(e)(1)(ii) and 164.308(b)(2), Business Associate shall ensure that any subcontractors that create, receive, maintain, or transmit PHI on behalf of Business Associate agree to the same restrictions, conditions, and requirements that apply to Business Associate with respect to such PHI.

(b) {{SUBCONTRACTOR_COMPLIANCE}}

(c) Business Associate shall maintain an up-to-date list of all subcontractors with access to PHI and make such list available to Covered Entity upon request.

## SECTION 7 — INDIVIDUAL ACCESS RIGHTS (HHS Element 6)

(a) Business Associate shall make PHI maintained in a Designated Record Set available to Covered Entity for inspection and copying within fifteen (15) business days of a request by Covered Entity, to enable Covered Entity to fulfill its obligations under 45 CFR 164.524.

(b) If Business Associate maintains PHI in an electronic Designated Record Set, Business Associate shall provide such information in the electronic form and format requested by the Individual, if readily producible, or in a readable electronic form and format agreed to by Covered Entity and the Individual.

(c) If any Individual requests access to PHI directly from Business Associate, Business Associate shall, within five (5) business days, forward such request to Covered Entity for handling.

## SECTION 8 — AMENDMENT OF PHI (HHS Element 7)

(a) Business Associate shall make PHI maintained in a Designated Record Set available to Covered Entity for amendment and shall incorporate any amendments to PHI within fifteen (15) business days when directed by Covered Entity, to enable Covered Entity to fulfill its obligations under 45 CFR 164.526.

(b) If any Individual requests an amendment to PHI directly from Business Associate, Business Associate shall, within five (5) business days, forward such request to Covered Entity for handling.

## SECTION 9 — ACCOUNTING OF DISCLOSURES (HHS Element 8)

(a) Business Associate shall document all disclosures of PHI and information related to such disclosures as would be required for Covered Entity to respond to a request by an Individual for an accounting of disclosures in accordance with 45 CFR 164.528.

(b) Business Associate shall make such documentation available to Covered Entity within fifteen (15) business days of a request by Covered Entity.

(c) Business Associate shall maintain records of all disclosures for a period of at least six (6) years from the date of the disclosure.

## SECTION 10 — GOVERNMENT ACCESS (HHS Element 9)

(a) Business Associate shall make its internal practices, books, and records relating to the use and disclosure of PHI available to the Secretary for purposes of determining Covered Entity's compliance with the Privacy Rule and Security Rule.

(b) Business Associate shall respond to any inquiry from the Secretary within thirty (30) days and shall cooperate fully with any compliance review or investigation conducted by the Secretary.

(c) Business Associate shall maintain all records related to this Agreement for a minimum of six (6) years from the date of creation or last effective date, whichever is later, as required by 45 CFR 164.530(j).

## SECTION 11 — TERMINATION AND PHI DISPOSITION (HHS Element 10)

(a) This Agreement shall be effective as of the Effective Date and shall terminate on {{EXPIRATION_DATE}} unless earlier terminated as provided herein.

(b) Covered Entity may terminate this Agreement immediately if Covered Entity determines that Business Associate has violated a material term of this Agreement.

(c) Upon termination of this Agreement for any reason, Business Associate shall:
    (i) Return or destroy all PHI received from Covered Entity, or created or received by Business Associate on behalf of Covered Entity, within thirty (30) days of termination;
    (ii) Retain no copies of PHI in any form;
    (iii) Certify in writing to Covered Entity that all PHI has been returned or destroyed.

(d) If return or destruction of PHI is not feasible, Business Associate shall extend the protections of this Agreement to such PHI and limit further uses and disclosures to those purposes that make the return or destruction infeasible, for so long as Business Associate maintains such PHI.

## SECTION 12 — MISSISSIPPI STATE LAW PROVISIONS

(a) The parties acknowledge that the Mississippi Uniform Health-Care Decisions Act (Miss. Code Ann. 41-41-201 et seq.) and related Mississippi health privacy statutes may impose obligations beyond those required by HIPAA.

(b) To the extent Mississippi state law provides greater privacy protections than HIPAA, Business Associate shall comply with the more protective standard.

(c) {{STATE_RETENTION_NOTICE}}

(d) Business Associate acknowledges that the Mississippi State Department of Health, as a state governmental entity, may be subject to the Mississippi Public Records Act (Miss. Code Ann. 25-61-1 et seq.), and that certain non-PHI records related to this Agreement may be subject to public records requests.

## SECTION 13 — GENERAL PROVISIONS

(a) **Indemnification.** Business Associate shall indemnify and hold harmless Covered Entity from and against any and all claims, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or in connection with any Breach or violation of this Agreement by Business Associate or its subcontractors.

(b) **Insurance.** Business Associate shall maintain cyber liability insurance with coverage of not less than one million dollars ($1,000,000) per occurrence and three million dollars ($3,000,000) in the aggregate.

(c) **Governing Law.** This Agreement shall be governed by and construed in accordance with the laws of the State of Mississippi, without regard to conflicts of law principles, and applicable federal law including HIPAA and the HITECH Act.

(d) **Entire Agreement.** This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior agreements, representations, and understandings.

(e) **Amendment.** This Agreement may only be amended by a written instrument signed by both parties. The parties agree to take such action as is necessary to amend this Agreement from time to time as necessary for compliance with HIPAA regulations.

(f) **Survival.** The obligations of Business Associate under Sections 4, 5, 9, 10, and 11 shall survive the termination of this Agreement.

(g) **Notices.** All notices required or permitted under this Agreement shall be in writing and shall be delivered by certified mail, return receipt requested, to the addresses set forth above.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.`;

// ─── Template Variables ───────────────────────────────────────────────────────

/** All template variables and their descriptions. */
const TEMPLATE_VARIABLES = {
  COVERED_ENTITY_NAME: "Name of the Covered Entity (clinic/organization)",
  COVERED_ENTITY_ADDRESS: "Address of the Covered Entity",
  COVERED_ENTITY_CONTACT: "Contact information for the Covered Entity",
  COVERED_ENTITY_NPI: "National Provider Identifier",
  HIPAA_OFFICER: "Name of the HIPAA Privacy/Security Officer",
  BUSINESS_ASSOCIATE_NAME: "Name of the Business Associate (vendor)",
  BUSINESS_ASSOCIATE_ADDRESS: "Address of the Business Associate",
  BUSINESS_ASSOCIATE_CONTACT: "Contact information for the Business Associate",
  EFFECTIVE_DATE: "ISO 8601 date the agreement takes effect",
  EXPIRATION_DATE: "ISO 8601 date the agreement expires",
  TERM_YEARS: "Contract term in years",
  CONTRACT_TYPE: "Type of contract/service",
  BREACH_NOTIFICATION_DAYS: "Number of days for breach notification SLA",
  STATE_RETENTION_NOTICE: "Mississippi state retention notice (if applicable)",
  SUBCONTRACTOR_COMPLIANCE: "Subcontractor compliance requirements",
  SOC2_REQUIREMENT: "SOC 2 audit report requirement (if applicable)",
} as const;

type TemplateVariableKey = keyof typeof TEMPLATE_VARIABLES;

/** Map of camelCase parameter names to UPPER_SNAKE_CASE template variables. */
const PARAM_TO_VARIABLE: Record<string, TemplateVariableKey> = {
  coveredEntityName: "COVERED_ENTITY_NAME",
  coveredEntityAddress: "COVERED_ENTITY_ADDRESS",
  coveredEntityContact: "COVERED_ENTITY_CONTACT",
  coveredEntityNPI: "COVERED_ENTITY_NPI",
  hipaaOfficer: "HIPAA_OFFICER",
  businessAssociateName: "BUSINESS_ASSOCIATE_NAME",
  businessAssociateAddress: "BUSINESS_ASSOCIATE_ADDRESS",
  businessAssociateContact: "BUSINESS_ASSOCIATE_CONTACT",
  effectiveDate: "EFFECTIVE_DATE",
  expirationDate: "EXPIRATION_DATE",
  termYears: "TERM_YEARS",
  contractType: "CONTRACT_TYPE",
  breachNotificationDays: "BREACH_NOTIFICATION_DAYS",
  stateRetentionNotice: "STATE_RETENTION_NOTICE",
  subcontractorCompliance: "SUBCONTRACTOR_COMPLIANCE",
  soc2Requirement: "SOC2_REQUIREMENT",
};

// ─── Public API ───────────────────────────────────────────────────────────────

interface TemplateParams {
  coveredEntityName: string;
  coveredEntityAddress: string;
  coveredEntityContact: string;
  coveredEntityNPI: string;
  hipaaOfficer: string;
  businessAssociateName: string;
  businessAssociateAddress: string;
  businessAssociateContact: string;
  effectiveDate: string;
  expirationDate: string;
  termYears: string;
  contractType: string;
  breachNotificationDays: string;
  stateRetentionNotice: string;
  subcontractorCompliance: string;
  soc2Requirement: string;
}

/**
 * Populate the BAA template with the given parameters.
 * Replaces all {{VARIABLE}} placeholders with the corresponding values.
 */
export function populateTemplate(params: TemplateParams): string {
  let populated = BAA_TEMPLATE;

  for (const [paramKey, variableKey] of Object.entries(PARAM_TO_VARIABLE)) {
    const value = params[paramKey as keyof TemplateParams];
    const placeholder = `{{${variableKey}}}`;
    populated = populated.replaceAll(placeholder, value);
  }

  return populated;
}

/**
 * Generate a fully populated BAA document string.
 * Convenience wrapper around populateTemplate with validation.
 */
export function generateBAADocument(params: TemplateParams): {
  content: string;
  version: string;
  valid: boolean;
  missingVariables: string[];
} {
  const content = populateTemplate(params);
  const { valid, missingVariables } = validateTemplatePopulation(content);

  return {
    content,
    version: TEMPLATE_VERSION,
    valid,
    missingVariables,
  };
}

/**
 * Returns the current template version.
 */
export function getTemplateVersion(): string {
  return TEMPLATE_VERSION;
}

/**
 * Validate that all template variables have been replaced.
 * Returns the list of any remaining unresolved {{VARIABLE}} placeholders.
 */
export function validateTemplatePopulation(populatedContent: string): {
  valid: boolean;
  missingVariables: string[];
} {
  const regex = /\{\{([A-Z_]+)\}\}/g;
  const missingVariables: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(populatedContent)) !== null) {
    if (match[1]) {
      missingVariables.push(match[1]);
    }
  }

  return {
    valid: missingVariables.length === 0,
    missingVariables,
  };
}

/**
 * Get the raw template text (for preview or testing).
 */
export function getRawTemplate(): string {
  return BAA_TEMPLATE;
}

/**
 * Get the list of all template variables and their descriptions.
 */
export function getTemplateVariables(): Record<string, string> {
  return { ...TEMPLATE_VARIABLES };
}
