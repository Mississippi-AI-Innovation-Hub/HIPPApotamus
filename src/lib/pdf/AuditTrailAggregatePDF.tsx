import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { pdfColors, pdfTypography, pdfLayout } from "./styles";
import type { AuditLog, BAA, Vendor } from "@/types";

const styles = StyleSheet.create({
  page: {
    ...pdfLayout.page,
    fontFamily: "Helvetica",
  },
  header: {
    backgroundColor: pdfColors.slate[800],
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
    color: pdfColors.slate[300],
    textAlign: "center",
    marginTop: 4,
  },
  summaryBox: {
    backgroundColor: pdfColors.slate[50],
    borderWidth: 1,
    borderColor: pdfColors.slate[200],
    padding: 12,
    marginBottom: 16,
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  summaryLabel: {
    ...pdfTypography.label,
    width: 140,
  },
  summaryValue: {
    ...pdfTypography.body,
    flex: 1,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: pdfColors.teal[700],
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: "bold",
    color: pdfColors.white,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.slate[100],
  },
  tableRowAlt: {
    backgroundColor: pdfColors.slate[50],
  },
  tableCell: {
    ...pdfTypography.body,
    fontSize: 8,
  },
  colTimestamp: { width: "16%" },
  colVendor: { width: "18%" },
  colAction: { width: "22%" },
  colPerformedBy: { width: "18%" },
  colDetails: { width: "18%" },
  colIP: { width: "8%" },
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

interface AuditTrailAggregateProps {
  packetName: string;
  baas: BAA[];
  vendorsById: Record<string, Vendor>;
  logs: AuditLog[];
  generatedAt: string;
}

export function AuditTrailAggregatePDF({
  packetName,
  baas,
  vendorsById,
  logs,
  generatedAt,
}: AuditTrailAggregateProps) {
  // Build a baaId → vendor name lookup for the "Vendor" column.
  const baaToVendorName = new Map<string, string>();
  for (const baa of baas) {
    const v = vendorsById[baa.vendorId];
    baaToVendorName.set(baa.id, v?.name ?? "Unknown");
  }

  const sorted = [...logs].sort((a, b) =>
    a.performedAt.localeCompare(b.performedAt),
  );

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>FULL AUDIT TRAIL</Text>
          <Text style={styles.headerSubtitle}>
            {packetName} — Generated {new Date(generatedAt).toLocaleString("en-US")}
          </Text>
        </View>

        {/* Summary */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>BAAs COVERED:</Text>
            <Text style={styles.summaryValue}>{baas.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>TOTAL EVENTS:</Text>
            <Text style={styles.summaryValue}>{sorted.length}</Text>
          </View>
          {sorted.length > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>EVENT RANGE:</Text>
              <Text style={styles.summaryValue}>
                {new Date(sorted[0].performedAt).toLocaleDateString("en-US")} —{" "}
                {new Date(sorted[sorted.length - 1].performedAt).toLocaleDateString("en-US")}
              </Text>
            </View>
          )}
        </View>

        {/* Table header */}
        <View style={styles.tableHeader} fixed>
          <Text style={[styles.tableHeaderText, styles.colTimestamp]}>Timestamp</Text>
          <Text style={[styles.tableHeaderText, styles.colVendor]}>Vendor</Text>
          <Text style={[styles.tableHeaderText, styles.colAction]}>Action</Text>
          <Text style={[styles.tableHeaderText, styles.colPerformedBy]}>Performed By</Text>
          <Text style={[styles.tableHeaderText, styles.colDetails]}>Details</Text>
          <Text style={[styles.tableHeaderText, styles.colIP]}>IP</Text>
        </View>

        {sorted.map((log, index) => (
          <View
            key={log.id}
            style={[
              styles.tableRow,
              index % 2 === 1 ? styles.tableRowAlt : {},
            ]}
            wrap={false}
          >
            <Text style={[styles.tableCell, styles.colTimestamp]}>
              {new Date(log.performedAt).toLocaleString("en-US")}
            </Text>
            <Text style={[styles.tableCell, styles.colVendor]}>
              {baaToVendorName.get(log.baaId) ?? "—"}
            </Text>
            <Text style={[styles.tableCell, styles.colAction]}>{log.action}</Text>
            <Text style={[styles.tableCell, styles.colPerformedBy]}>
              {log.performedBy}
            </Text>
            <Text style={[styles.tableCell, styles.colDetails]}>
              {Object.entries(log.details)
                .map(([k, v]) => `${k}: ${String(v)}`)
                .join("; ")}
            </Text>
            <Text style={[styles.tableCell, styles.colIP]}>
              {log.ipAddress ?? "N/A"}
            </Text>
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            HIPAApotamus — Aggregate Audit Trail
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
