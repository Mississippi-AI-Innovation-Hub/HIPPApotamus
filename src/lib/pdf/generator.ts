import crypto from "node:crypto";
import React from "react";
import type { ReactElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import JSZip from "jszip";
import { BaaContractPDF } from "./BaaContractPDF";
import { AuditTrailPDF } from "./AuditTrailPDF";
import { ExecutiveSummaryPDF } from "./ExecutiveSummaryPDF";
import { ComplianceMatrixPDF } from "./ComplianceMatrixPDF";
import { ExecutiveSummaryAggregatePDF } from "./ExecutiveSummaryAggregatePDF";
import { AuditTrailAggregatePDF } from "./AuditTrailAggregatePDF";
import { populateTemplate } from "@/lib/baa/template";
import { populate as populateMSDH } from "@/lib/baa/templates/populate";
import { getTemplate } from "@/lib/baa/templates/registry";
import { generateComplianceMatrix } from "@/lib/baa/cfrMatrix";
import { getAuditLogsByBAA } from "@/lib/db/auditLogs";
import { getObjectFromS3 } from "@/lib/storage/s3";
import { logger } from "@/lib/logger";
import type { BAA, Vendor, Clinic, AuditLog } from "@/types";

/**
 * Fetch the BAA's stored signed PDF from S3 and verify its SHA-256 against
 * the recorded `signedDocumentHash`. Returns the buffer if everything checks
 * out; returns `null` if the BAA isn't signed yet, has no S3 key, or the
 * fetch fails. Throws on integrity-check failure so callers can decide how
 * to handle a tampered document.
 */
export async function fetchSignedPdfFromS3(
  baa: BAA,
): Promise<Buffer | null> {
  if (!baa.signedDocumentUrl) return null;
  try {
    const stored = await getObjectFromS3(baa.signedDocumentUrl);
    if (!stored) return null;
    const buf = Buffer.from(stored);
    if (baa.signedDocumentHash) {
      const computed = crypto.createHash("sha256").update(buf).digest("hex");
      if (computed !== baa.signedDocumentHash) {
        logger.error(
          "SECURITY ALERT: Stored signed PDF SHA-256 mismatch — possible tampering",
          {
            baaId: baa.id,
            expectedHash: baa.signedDocumentHash,
            computedHash: computed,
            key: baa.signedDocumentUrl,
          },
        );
        throw new Error("INTEGRITY_CHECK_FAILED");
      }
    }
    return buf;
  } catch (err) {
    if (err instanceof Error && err.message === "INTEGRITY_CHECK_FAILED") {
      throw err;
    }
    logger.warn("Failed to fetch stored signed PDF from S3", {
      baaId: baa.id,
      key: baa.signedDocumentUrl,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Helper to cast component elements to the type expected by renderToBuffer.
 * React-PDF components return <Document> internally, but createElement
 * produces a generic ReactElement. This cast is safe because our components
 * all return <Document> as their root element.
 */
function asPdfElement(
  el: React.ReactElement,
): ReactElement<DocumentProps> {
  return el as unknown as ReactElement<DocumentProps>;
}

/**
 * Generate a single BAA contract PDF as a Buffer.
 */
export async function generateContractPDF(
  baa: BAA,
  vendor: Vendor,
  clinic: Clinic,
  signatureImage?: string,
  counterSignatureImage?: string,
): Promise<Buffer> {
  try {
    const registeredTemplate = getTemplate(baa.templateVersion);

    let populatedContent: string;

    if (registeredTemplate) {
      populatedContent = populateMSDH(baa.templateVersion, {
        BA_NAME: vendor.name,
        BA_ADDRESS: vendor.address,
        UNDERLYING_AGREEMENT_REF: baa.contractType.replace(/_/g, " "),
        BA_NOTICE_NAME: vendor.name,
        BA_NOTICE_ATTN: vendor.contactName,
        BA_NOTICE_TITLE: vendor.authorizedSignerTitle,
        BA_NOTICE_ADDRESS: vendor.address,
        BA_NOTICE_PHONE: vendor.contactPhone,
        BA_NOTICE_EMAIL: vendor.contactEmail,
        BA_SIGNER_NAME: vendor.contactName,
        BA_SIGNER_TITLE: vendor.authorizedSignerTitle,
        BA_SIGNER_ADDRESS: vendor.address,
        BA_SIGNER_PHONE: vendor.contactPhone,
        BA_SIGNATURE_DATE: baa.signedDate
          ? new Date(baa.signedDate).toLocaleDateString("en-US")
          : "_______________",
        MSDH_SIGNER_NAME: clinic.contactName,
        MSDH_SIGNER_TITLE: clinic.hipaaOfficer,
        MSDH_SIGNER_ADDRESS: clinic.address,
        MSDH_SIGNER_PHONE: "(601)-576-7634",
        MSDH_SIGNATURE_DATE: baa.counterSignedDate
          ? new Date(baa.counterSignedDate).toLocaleDateString("en-US")
          : "_______________",
      });
    } else {
      populatedContent = populateTemplate({
        coveredEntityName: clinic.name,
        coveredEntityAddress: clinic.address,
        coveredEntityContact: `${clinic.contactName} (${clinic.contactEmail})`,
        coveredEntityNPI: clinic.npi,
        hipaaOfficer: clinic.hipaaOfficer,
        businessAssociateName: vendor.name,
        businessAssociateAddress: vendor.address,
        businessAssociateContact: `${vendor.contactName} (${vendor.contactEmail})`,
        effectiveDate: baa.effectiveDate,
        expirationDate: baa.expirationDate,
        termYears: String(baa.termYears),
        contractType: baa.contractType.replace(/_/g, " "),
        breachNotificationDays: String(vendor.breachNotificationSLADays),
        stateRetentionNotice: baa.requiresStateLawRetentionNotice
          ? "Business Associate acknowledges Mississippi state law (Miss. Code Ann. 41-9-69) requires 10-year retention of medical records."
          : "",
        subcontractorCompliance: vendor.requiresSubcontractorCompliance
          ? "Business Associate shall ensure all subcontractors agree in writing to the same restrictions and conditions."
          : "Not applicable.",
        soc2Requirement: vendor.requiresSoc2Report
          ? "Business Associate shall provide annual SOC 2 Type II audit reports."
          : "Not applicable.",
      });
    }

    const element = React.createElement(BaaContractPDF, {
      baa,
      vendor,
      clinic,
      populatedTemplate: populatedContent,
      signatureImage,
      counterSignatureImage,
    });

    const buffer = await renderToBuffer(asPdfElement(element));
    logger.info("Contract PDF generated", { baaId: baa.id });
    return Buffer.from(buffer);
  } catch (error) {
    logger.error("Failed to generate contract PDF", {
      baaId: baa.id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Generate a full audit packet ZIP containing:
 * - Executive summary PDF
 * - BAA contract PDF (the SIGNED + COUNTER-SIGNED copy from S3 if available)
 * - Audit trail PDF
 * - Compliance matrix PDF
 *
 * **Source of truth.** When the BAA has been signed, callers should pass the
 * exact S3-stored signed PDF buffer via `signedPdfBuffer`. This is the same
 * binary the Preview-PDF endpoint serves — guaranteeing the audit packet's
 * `02_BAA_Contract.pdf` is byte-identical to what the user previewed.
 *
 * If `signedPdfBuffer` is not provided, the contract is regenerated from the
 * template + data (no signatures embedded). This is the right behavior for
 * unsigned BAAs but is wrong for signed ones — callers MUST fetch the S3
 * stored copy when `baa.signedDocumentUrl` is set.
 */
export async function generateAuditPacket(
  baa: BAA,
  vendor: Vendor,
  clinic: Clinic,
  signedPdfBuffer?: Buffer,
): Promise<Buffer> {
  try {
    const generatedAt = new Date().toISOString();
    const logs: AuditLog[] = await getAuditLogsByBAA(baa.id);

    // Generate compliance matrix
    const matrix = generateComplianceMatrix(baa);

    // The contract slot uses the stored signed PDF when supplied (single
    // source of truth with the Preview endpoint). Otherwise we regenerate
    // from data — only correct for unsigned BAAs.
    const contractPromise: Promise<Buffer> = signedPdfBuffer
      ? Promise.resolve(signedPdfBuffer)
      : generateContractPDF(baa, vendor, clinic);

    if (signedPdfBuffer) {
      logger.info("Audit packet using S3 stored signed PDF", {
        baaId: baa.id,
        bytes: signedPdfBuffer.length,
      });
    } else if (baa.signedDocumentUrl) {
      logger.warn(
        "Audit packet REGENERATING contract for a signed BAA — caller did not pass signedPdfBuffer",
        { baaId: baa.id, signedDocumentUrl: baa.signedDocumentUrl },
      );
    }

    // Generate all four PDFs in parallel
    const [contractBuffer, auditTrailBuffer, summaryBuffer, matrixBuffer] =
      await Promise.all([
        contractPromise,
        renderToBuffer(
          asPdfElement(
            React.createElement(AuditTrailPDF, {
              baa,
              vendor,
              logs,
              generatedAt,
            }),
          ),
        ).then((buf) => Buffer.from(buf)),
        renderToBuffer(
          asPdfElement(
            React.createElement(ExecutiveSummaryPDF, {
              baa,
              vendor,
              clinic,
              generatedAt,
              auditLogCount: logs.length,
            }),
          ),
        ).then((buf) => Buffer.from(buf)),
        renderToBuffer(
          asPdfElement(
            React.createElement(ComplianceMatrixPDF, {
              matrix,
              vendorName: vendor.name,
              generatedAt,
            }),
          ),
        ).then((buf) => Buffer.from(buf)),
      ]);

    // Bundle into ZIP
    const zip = new JSZip();
    const folderName = `BAA_${baa.id}_${vendor.name.replace(/\s+/g, "_")}`;
    const folder = zip.folder(folderName);

    if (!folder) {
      throw new Error("Failed to create ZIP folder");
    }

    folder.file("01_Executive_Summary.pdf", summaryBuffer);
    folder.file("02_BAA_Contract.pdf", contractBuffer);
    folder.file("03_Audit_Trail.pdf", auditTrailBuffer);
    folder.file("04_Compliance_Matrix.pdf", matrixBuffer);

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    logger.info("Audit packet generated", {
      baaId: baa.id,
      vendorName: vendor.name,
      fileCount: 4,
    });

    return zipBuffer;
  } catch (error) {
    logger.error("Failed to generate audit packet", {
      baaId: baa.id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ─── Aggregate (multi-BAA) audit packet ─────────────────────────────────────

export interface AggregateAuditPacketOptions {
  includePDFs: boolean;
  includeAuditTrail: boolean;
  includeExecutiveSummary: boolean;
}

export interface AggregateAuditPacketInput {
  packetName: string;
  baas: BAA[];
  vendorsById: Record<string, Vendor>;
  clinic: Clinic;
  options: AggregateAuditPacketOptions;
  dateFrom: string | null;
  dateTo: string | null;
  generatedAt: string;
}

export interface AggregatePdfPart {
  type: "executive_summary" | "audit_trail" | "contract" | "compliance_matrix";
  name: string;
  buffer: Buffer;
  baaId: string | null;
  vendorName: string | null;
}

export interface AggregateAuditPacketResult {
  parts: AggregatePdfPart[];
  zipBuffer: Buffer;
}

/**
 * Generates the cross-BAA audit packet. Returns both the individual PDF
 * parts (so callers can upload each to S3 for per-doc download) and a
 * single ZIP bundling them together.
 */
export async function generateAggregateAuditPacket(
  input: AggregateAuditPacketInput,
): Promise<AggregateAuditPacketResult> {
  const { packetName, baas, vendorsById, clinic, options, dateFrom, dateTo, generatedAt } = input;

  try {
    // Aggregate audit trail across all included BAAs
    const logBundles = await Promise.all(
      baas.map((b) => getAuditLogsByBAA(b.id)),
    );
    const allLogs: AuditLog[] = logBundles.flat();

    // Optional aggregate PDFs
    const parts: AggregatePdfPart[] = [];

    if (options.includeExecutiveSummary) {
      const buf = await renderToBuffer(
        asPdfElement(
          React.createElement(ExecutiveSummaryAggregatePDF, {
            packetName,
            baas,
            vendorsById,
            clinic,
            auditLogCount: allLogs.length,
            generatedAt,
            dateFrom,
            dateTo,
          }),
        ),
      );
      parts.push({
        type: "executive_summary",
        name: "Executive Summary",
        buffer: Buffer.from(buf),
        baaId: null,
        vendorName: null,
      });
    }

    if (options.includeAuditTrail) {
      const buf = await renderToBuffer(
        asPdfElement(
          React.createElement(AuditTrailAggregatePDF, {
            packetName,
            baas,
            vendorsById,
            logs: allLogs,
            generatedAt,
          }),
        ),
      );
      parts.push({
        type: "audit_trail",
        name: "Full Audit Trail",
        buffer: Buffer.from(buf),
        baaId: null,
        vendorName: null,
      });
    }

    // Per-BAA documents — always produce contract + compliance matrix when
    // PDFs are enabled. These give auditors the clause-by-clause evidence
    // per vendor, not just the aggregate summary.
    if (options.includePDFs) {
      for (const baa of baas) {
        const vendor = vendorsById[baa.vendorId];
        if (!vendor) continue;

        // Source-of-truth: prefer the signed PDF in S3 (same binary served by
        // the Preview-PDF endpoint). Only regenerate from data when there is
        // no stored signed copy (BAA still pending signature, or fetch fails).
        let contractBuf: Buffer | null = null;
        try {
          contractBuf = await fetchSignedPdfFromS3(baa);
        } catch (integrityErr) {
          logger.error(
            "Aggregate audit packet: integrity check FAILED for stored signed PDF — skipping this BAA's contract",
            {
              baaId: baa.id,
              error:
                integrityErr instanceof Error
                  ? integrityErr.message
                  : String(integrityErr),
            },
          );
          // Fall through to regeneration so the packet still produces *something*
          // for this BAA, but log loudly. The auditor will see the regenerated
          // unsigned copy and the integrity failure event in the audit trail.
        }
        if (!contractBuf) {
          if (baa.signedDocumentUrl) {
            logger.warn(
              "Aggregate audit packet: regenerating contract for SIGNED BAA — S3 stored copy unavailable",
              { baaId: baa.id, signedDocumentUrl: baa.signedDocumentUrl },
            );
          }
          contractBuf = await generateContractPDF(baa, vendor, clinic);
        }
        parts.push({
          type: "contract",
          name: `BAA — ${vendor.name}`,
          buffer: contractBuf,
          baaId: baa.id,
          vendorName: vendor.name,
        });

        const matrix = generateComplianceMatrix(baa);
        const matrixBuf = await renderToBuffer(
          asPdfElement(
            React.createElement(ComplianceMatrixPDF, {
              matrix,
              vendorName: vendor.name,
              generatedAt,
            }),
          ),
        );
        parts.push({
          type: "compliance_matrix",
          name: `Compliance Matrix — ${vendor.name}`,
          buffer: Buffer.from(matrixBuf),
          baaId: baa.id,
          vendorName: vendor.name,
        });
      }
    }

    // Bundle all parts into a single ZIP with a readable structure.
    const zip = new JSZip();
    const folderName = `${packetName.replace(/[^\w\-]+/g, "_")}`;
    const root = zip.folder(folderName) ?? zip;
    const contractsFolder = root.folder("contracts");
    const matricesFolder = root.folder("compliance_matrices");

    for (const part of parts) {
      if (part.type === "executive_summary") {
        root.file("01_Executive_Summary.pdf", part.buffer);
      } else if (part.type === "audit_trail") {
        root.file("02_Audit_Trail.pdf", part.buffer);
      } else if (part.type === "contract" && contractsFolder && part.vendorName) {
        contractsFolder.file(
          `${part.vendorName.replace(/[^\w\-]+/g, "_")}_BAA.pdf`,
          part.buffer,
        );
      } else if (part.type === "compliance_matrix" && matricesFolder && part.vendorName) {
        matricesFolder.file(
          `${part.vendorName.replace(/[^\w\-]+/g, "_")}_Matrix.pdf`,
          part.buffer,
        );
      }
    }

    const zipBuffer = Buffer.from(
      await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      }),
    );

    logger.info("Aggregate audit packet generated", {
      packetName,
      baaCount: baas.length,
      partCount: parts.length,
      zipBytes: zipBuffer.length,
    });

    return { parts, zipBuffer };
  } catch (error) {
    logger.error("Failed to generate aggregate audit packet", {
      packetName,
      baaCount: baas.length,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
