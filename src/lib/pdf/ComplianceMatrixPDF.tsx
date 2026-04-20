import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { pdfColors, pdfTypography, pdfLayout } from "./styles";
import type { ComplianceMatrix } from "@/types";

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
    fontSize: 20,
    fontWeight: "bold",
    color: pdfColors.white,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 10,
    color: pdfColors.teal[100],
    textAlign: "center",
    marginTop: 4,
  },
  summaryBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: pdfColors.teal[50],
    borderWidth: 1,
    borderColor: pdfColors.teal[500],
    borderRadius: 4,
    padding: 12,
    marginBottom: 20,
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: pdfColors.teal[700],
  },
  summaryLabel: {
    fontSize: 8,
    color: pdfColors.slate[600],
    marginTop: 2,
  },
  sectionTitle: {
    ...pdfTypography.heading3,
    borderBottomWidth: 2,
    borderBottomColor: pdfColors.teal[500],
    paddingBottom: 4,
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: pdfColors.slate[100],
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.slate[300],
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.slate[200],
    paddingVertical: 4,
    paddingHorizontal: 6,
    minHeight: 24,
  },
  colStatus: { width: 20, alignItems: "center", justifyContent: "center" },
  colCitation: { width: 90 },
  colRequirement: { flex: 1, paddingRight: 8 },
  colSection: { width: 160 },
  headerText: {
    fontSize: 7,
    fontWeight: "bold",
    color: pdfColors.slate[600],
    textTransform: "uppercase",
  },
  cellText: {
    fontSize: 7,
    color: pdfColors.slate[700],
    lineHeight: 1.4,
  },
  cellMono: {
    fontSize: 7,
    color: pdfColors.slate[500],
    fontFamily: "Courier",
  },
  checkmark: {
    fontSize: 8,
    color: pdfColors.emerald[600],
    fontWeight: "bold",
  },
  xmark: {
    fontSize: 8,
    color: pdfColors.red[600],
    fontWeight: "bold",
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

interface ComplianceMatrixPDFProps {
  matrix: ComplianceMatrix;
  vendorName: string;
  generatedAt: string;
}

export function ComplianceMatrixPDF({
  matrix,
  vendorName,
  generatedAt,
}: ComplianceMatrixPDFProps) {
  const federalRows = matrix.rows.filter((r) => r.cfrCitation.startsWith("164.504"));
  const msdhRows = matrix.rows.filter((r) => r.cfrCitation.startsWith("MSDH."));
  const totalSatisfied = matrix.rows.filter((r) => r.satisfied).length;
  const pct = matrix.rows.length > 0
    ? Math.round((totalSatisfied / matrix.rows.length) * 100)
    : 0;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            HIPAA BAA COMPLIANCE MATRIX
          </Text>
          <Text style={styles.headerSubtitle}>
            45 CFR 164.504(e)(2) Clause-by-Clause Satisfaction — {vendorName}
          </Text>
        </View>

        {/* Summary */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{pct}%</Text>
            <Text style={styles.summaryLabel}>Compliance Score</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {totalSatisfied}/{matrix.rows.length}
            </Text>
            <Text style={styles.summaryLabel}>Requirements Met</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{federalRows.length}</Text>
            <Text style={styles.summaryLabel}>Federal Requirements</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{msdhRows.length}</Text>
            <Text style={styles.summaryLabel}>MSDH-Specific</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={{ ...styles.summaryValue, fontSize: 10 }}>
              v{matrix.templateVersion}
            </Text>
            <Text style={styles.summaryLabel}>Template Version</Text>
          </View>
        </View>

        {/* Federal Requirements Table */}
        <Text style={styles.sectionTitle}>
          Federal Requirements — 45 CFR 164.504(e)(2)
        </Text>
        <View style={styles.tableHeader}>
          <View style={styles.colStatus}>
            <Text style={styles.headerText} />
          </View>
          <View style={styles.colCitation}>
            <Text style={styles.headerText}>Citation</Text>
          </View>
          <View style={styles.colRequirement}>
            <Text style={styles.headerText}>Requirement</Text>
          </View>
          <View style={styles.colSection}>
            <Text style={styles.headerText}>MSDH Section</Text>
          </View>
        </View>
        {federalRows.map((row) => (
          <View key={row.cfrCitation} style={styles.tableRow} wrap={false}>
            <View style={styles.colStatus}>
              <Text style={row.satisfied ? styles.checkmark : styles.xmark}>
                {row.satisfied ? "\u2713" : "\u2717"}
              </Text>
            </View>
            <View style={styles.colCitation}>
              <Text style={styles.cellMono}>{row.cfrCitation}</Text>
            </View>
            <View style={styles.colRequirement}>
              <Text style={styles.cellText}>{row.cfrRequirement}</Text>
            </View>
            <View style={styles.colSection}>
              <Text style={styles.cellText}>{row.msdhSection}</Text>
            </View>
          </View>
        ))}

        {/* MSDH-Specific Provisions */}
        <Text style={{ ...styles.sectionTitle, marginTop: 16 }}>
          MSDH-Specific Provisions (Beyond Federal Minimum)
        </Text>
        <View style={styles.tableHeader}>
          <View style={styles.colStatus}>
            <Text style={styles.headerText} />
          </View>
          <View style={styles.colCitation}>
            <Text style={styles.headerText}>Provision</Text>
          </View>
          <View style={styles.colRequirement}>
            <Text style={styles.headerText}>Requirement</Text>
          </View>
          <View style={styles.colSection}>
            <Text style={styles.headerText}>MSDH Section</Text>
          </View>
        </View>
        {msdhRows.map((row) => (
          <View key={row.cfrCitation} style={styles.tableRow} wrap={false}>
            <View style={styles.colStatus}>
              <Text style={row.satisfied ? styles.checkmark : styles.xmark}>
                {row.satisfied ? "\u2713" : "\u2717"}
              </Text>
            </View>
            <View style={styles.colCitation}>
              <Text style={styles.cellMono}>
                {row.cfrCitation.replace("MSDH.", "")}
              </Text>
            </View>
            <View style={styles.colRequirement}>
              <Text style={styles.cellText}>{row.cfrRequirement}</Text>
            </View>
            <View style={styles.colSection}>
              <Text style={styles.cellText}>{row.msdhSection}</Text>
            </View>
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            HIPAApotamus Compliance Matrix — {vendorName}
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
