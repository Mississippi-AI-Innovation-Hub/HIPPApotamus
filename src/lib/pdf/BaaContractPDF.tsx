import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { pdfColors, pdfTypography, pdfLayout } from "./styles";
import type { BAA, Vendor, Clinic } from "@/types";

const styles = StyleSheet.create({
  page: {
    ...pdfLayout.page,
    fontFamily: "Helvetica",
  },
  header: {
    backgroundColor: pdfColors.teal[700],
    padding: 20,
    marginHorizontal: -48,
    marginTop: -48,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: pdfColors.white,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 11,
    color: pdfColors.teal[100],
    textAlign: "center",
    marginTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  metaLabel: {
    ...pdfTypography.label,
    width: 140,
  },
  metaValue: {
    ...pdfTypography.body,
    flex: 1,
  },
  sectionTitle: {
    ...pdfTypography.heading2,
    borderBottomWidth: 2,
    borderBottomColor: pdfColors.teal[500],
    paddingBottom: 4,
  },
  sectionBody: {
    ...pdfTypography.body,
    marginTop: 6,
  },
  divider: {
    ...pdfLayout.divider,
  },
  signatureBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 32,
  },
  signatureColumn: {
    width: "45%",
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.slate[800],
    marginTop: 48,
    marginBottom: 4,
  },
  signatureLabel: {
    ...pdfTypography.small,
    marginBottom: 2,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: pdfColors.slate[200],
    paddingTop: 8,
  },
  footerText: {
    ...pdfTypography.small,
  },
});

interface BaaContractPDFProps {
  baa: BAA;
  vendor: Vendor;
  clinic: Clinic;
  populatedTemplate: string;
}

/**
 * Full BAA contract PDF with all 10 HHS-required elements.
 */
export function BaaContractPDF({
  baa,
  vendor,
  clinic,
  populatedTemplate,
}: BaaContractPDFProps) {
  const sections = populatedTemplate
    .split(/\n## /)
    .filter(Boolean)
    .map((section) => {
      const lines = section.split("\n");
      const title = (lines[0] ?? "").replace(/^#+\s*/, "");
      const body = lines.slice(1).join("\n").trim();
      return { title, body };
    });

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            BUSINESS ASSOCIATE AGREEMENT
          </Text>
          <Text style={styles.headerSubtitle}>
            HIPAA Compliance Document — {baa.contractType.replace(/_/g, " ").toUpperCase()}
          </Text>
        </View>

        {/* Meta information */}
        <View style={{ marginBottom: 16 }}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>BAA REFERENCE:</Text>
            <Text style={styles.metaValue}>{baa.id}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>COVERED ENTITY:</Text>
            <Text style={styles.metaValue}>{clinic.name}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>BUSINESS ASSOCIATE:</Text>
            <Text style={styles.metaValue}>{vendor.name}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>EFFECTIVE DATE:</Text>
            <Text style={styles.metaValue}>{baa.effectiveDate}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>EXPIRATION DATE:</Text>
            <Text style={styles.metaValue}>{baa.expirationDate}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>TEMPLATE VERSION:</Text>
            <Text style={styles.metaValue}>{baa.templateVersion}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Contract sections */}
        {sections.map((section, index) => (
          <View key={index} style={{ marginBottom: 12 }} wrap={false}>
            <Text style={styles.sectionTitle}>
              {section.title}
            </Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        {/* Signature block */}
        <View style={styles.signatureBlock} wrap={false}>
          <View style={styles.signatureColumn}>
            <Text style={styles.signatureLabel}>COVERED ENTITY</Text>
            <Text style={{ ...pdfTypography.body, fontWeight: "bold" }}>
              {clinic.name}
            </Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Signature</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>
              Name: {clinic.hipaaOfficer}
            </Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Date</Text>
          </View>
          <View style={styles.signatureColumn}>
            <Text style={styles.signatureLabel}>BUSINESS ASSOCIATE</Text>
            <Text style={{ ...pdfTypography.body, fontWeight: "bold" }}>
              {vendor.name}
            </Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Signature</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>
              Name: {vendor.contactName}
            </Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Date</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            HIPAApotamus BAA Management System
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
