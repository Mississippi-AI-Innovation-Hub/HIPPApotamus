import React from "react";
import type { ReactElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import JSZip from "jszip";
import { BaaContractPDF } from "./BaaContractPDF";
import { AuditTrailPDF } from "./AuditTrailPDF";
import { ExecutiveSummaryPDF } from "./ExecutiveSummaryPDF";
import { populateTemplate } from "@/lib/baa/template";
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
    const populatedContent = populateTemplate({
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

    // Generate all three PDFs in parallel
    const [contractBuffer, auditTrailBuffer, summaryBuffer] =
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

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    logger.info("Audit packet generated", {
      baaId: baa.id,
      vendorName: vendor.name,
      fileCount: 3,
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
