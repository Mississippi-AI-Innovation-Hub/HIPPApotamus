/**
 * MSDH BAA Template Version Registry
 *
 * Tracks all legal-approved template versions with metadata for audit traceability.
 * When MSDH General Counsel revises the template, add a new version here.
 * Old versions remain in the registry so existing BAAs can trace back to their source.
 */
import type { BAATemplate } from "@/types";
import { MSDH_BAA_V2026_1 } from "./msdh_baa_v2026_1";
import { CFR_MAPPINGS } from "../cfrMappings";

interface RegisteredTemplate extends BAATemplate {
  getText: () => string;
}

const REGISTRY: Map<string, RegisteredTemplate> = new Map();

function register(template: RegisteredTemplate): void {
  REGISTRY.set(template.version, template);
}

register({
  version: "2026.1",
  effectiveDate: "2026-01-01",
  approvedBy: "MSDH Office of General Counsel",
  supersedes: null,
  sourceDocument: "docs/BAA template.docx — MSDH Business Associate Agreement (ITS Project No. 48420)",
  cfrMappings: CFR_MAPPINGS,
  changeLog: [
    "Initial port from RFP #4635 Attachment C",
    "Verbatim text from MSDH-approved BAA template",
    "5-day breach notification (§III.d.i)",
    "AES256/Triple DES + TLS 1.2+ encryption (§III.n)",
    "No offshore PHI transmission (§III.m)",
    "ITS Enterprise Security Policy compliance (§III.o)",
    "12-month credit monitoring for breaches (§III.t)",
    "MS law governing law + MS courts venue (§VII.j)",
  ],
  getText: () => MSDH_BAA_V2026_1,
});

export function getTemplate(version: string): RegisteredTemplate | null {
  return REGISTRY.get(version) ?? null;
}

export function getLatestVersion(): string {
  let latest: RegisteredTemplate | null = null;
  for (const template of REGISTRY.values()) {
    if (!latest || template.effectiveDate > latest.effectiveDate) {
      latest = template;
    }
  }
  if (!latest) throw new Error("No templates registered");
  return latest.version;
}

export function getTemplateText(version: string): string {
  const template = REGISTRY.get(version);
  if (!template) {
    throw new Error(`Unknown template version: ${version}. Available: ${Array.from(REGISTRY.keys()).join(", ")}`);
  }
  return template.getText();
}

export function getAllVersions(): BAATemplate[] {
  return Array.from(REGISTRY.values()).map(({ getText, ...meta }) => meta);
}

export function getTemplateMeta(version: string): BAATemplate | null {
  const template = REGISTRY.get(version);
  if (!template) return null;
  const { getText, ...meta } = template;
  return meta;
}
