/**
 * Template population: resolves {{PLACEHOLDER}} markers in the MSDH BAA template.
 *
 * Throws if any placeholder remains unresolved — no silent {{FOO}} leaks into signed PDFs.
 */
import type { MSDHTemplateValues } from "@/types";
import { getTemplateText } from "./registry";

const PLACEHOLDER_REGEX = /\{\{([A-Z_]+)\}\}/g;

/**
 * Populate a versioned MSDH BAA template with the provided values.
 * Every placeholder must be resolved or an error is thrown.
 */
export function populate(
  templateVersion: string,
  values: MSDHTemplateValues,
): string {
  const raw = getTemplateText(templateVersion);
  const valuesMap = values as unknown as Record<string, string>;

  let populated = raw;
  const unresolvedKeys: string[] = [];

  populated = raw.replace(PLACEHOLDER_REGEX, (match, key: string) => {
    const value = valuesMap[key];
    if (value === undefined || value === null || value === "") {
      unresolvedKeys.push(key);
      return match;
    }
    return value;
  });

  if (unresolvedKeys.length > 0) {
    throw new Error(
      `Unresolved template placeholders: ${unresolvedKeys.join(", ")}. ` +
      `All placeholders must be populated before generating a BAA document.`,
    );
  }

  return populated;
}

/**
 * Extract the list of placeholder keys from a template version.
 */
export function getPlaceholderKeys(templateVersion: string): string[] {
  const raw = getTemplateText(templateVersion);
  const keys = new Set<string>();
  let match: RegExpExecArray | null;
  const regex = new RegExp(PLACEHOLDER_REGEX.source, "g");
  while ((match = regex.exec(raw)) !== null) {
    if (match[1]) keys.add(match[1]);
  }
  return Array.from(keys);
}

/**
 * Validate that a set of values covers all placeholders in the template.
 * Returns the list of missing keys (empty if all are covered).
 */
export function validateValues(
  templateVersion: string,
  values: Partial<MSDHTemplateValues>,
): string[] {
  const required = getPlaceholderKeys(templateVersion);
  const valuesMap = values as unknown as Record<string, string>;
  return required.filter((key) => !valuesMap[key]);
}
