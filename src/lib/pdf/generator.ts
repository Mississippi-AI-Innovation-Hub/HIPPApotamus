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
import { logger } from "@/lib/logger";
import type { BAA, Vendor, Clinic, AuditLog } from "@/types";

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
 * - BAA contract PDF
 * - Audit trail PDF
 */
export async function generateAuditPacket(
  baa: BAA,
  vendor: Vendor,
  clinic: Clinic,
): Promise<Buffer> {
  try {
    const generatedAt = new Date().toISOString();
    const logs: AuditLog[] = await getAuditLogsByBAA(baa.id);

    // Generate compliance matrix
    const matrix = generateComplianceMatrix(baa);

    // Generate all four PDFs in parallel
    const [contractBuffer, auditTrailBuffer, summaryBuffer, matrixBuffer] =
      await Promise.all([
        generateContractPDF(baa, vendor, clinic),
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

        const contractBuf = await generateContractPDF(baa, vendor, clinic);
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
