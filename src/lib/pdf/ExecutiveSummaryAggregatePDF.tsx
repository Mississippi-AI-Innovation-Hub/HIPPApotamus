import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { pdfColors, pdfTypography, pdfLayout } from "./styles";
import type { BAA, Vendor, Clinic } from "@/types";

const styles = StyleSheet.create({
  page: {
    ...pdfLayout.page,
    fontFamily: "Helvetica",
  },
  coverHeader: {
    backgroundColor: pdfColors.teal[800],
    padding: 40,
    marginHorizontal: -48,
    marginTop: -48,
    marginBottom: 32,
    alignItems: "center",
  },
  coverTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: pdfColors.white,
    textAlign: "center",
  },
  coverSubtitle: {
    fontSize: 13,
    color: pdfColors.teal[100],
    textAlign: "center",
    marginTop: 8,
  },
  coverDate: {
    fontSize: 11,
    color: pdfColors.teal[100],
    textAlign: "center",
    marginTop: 16,
    opacity: 0.8,
  },
  sectionHeading: {
    ...pdfTypography.heading2,
    color: pdfColors.teal[700],
    marginTop: 16,
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: pdfColors.slate[50],
    borderWidth: 1,
    borderColor: pdfColors.slate[200],
    borderRadius: 4,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: {
    ...pdfTypography.heading3,
    color: pdfColors.teal[700],
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.teal[100],
    paddingBottom: 4,
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  cardLabel: {
    ...pdfTypography.label,
    width: 150,
  },
  cardValue: {
    ...pdfTypography.body,
    flex: 1,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
    gap: 8,
  },
  statBox: {
    flexGrow: 1,
    flexBasis: "22%",
    borderWidth: 1,
    borderColor: pdfColors.slate[200],
    borderRadius: 4,
    padding: 10,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: pdfColors.teal[700],
  },
  statLabel: {
    ...pdfTypography.small,
    textAlign: "center",
    marginTop: 2,
  },
  vendorTableHeader: {
    flexDirection: "row",
    backgroundColor: pdfColors.teal[700],
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  vendorTableHeaderText: {
    fontSize: 8,
    fontWeight: "bold",
    color: pdfColors.white,
    textTransform: "uppercase",
  },
  vendorTableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.slate[100],
  },
  vendorTableRowAlt: {
    backgroundColor: pdfColors.slate[50],
  },
  vendorCell: {
    ...pdfTypography.body,
    fontSize: 8,
  },
  colVendor: { width: "30%" },
  colType: { width: "22%" },
  colStatus: { width: "18%" },
  colEffective: { width: "15%" },
  colExpires: { width: "15%" },
  statusBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 7,
    fontWeight: "bold",
    color: pdfColors.white,
    textTransform: "uppercase",
  },
  complianceNote: {
    marginTop: 16,
    padding: 10,
    backgroundColor: pdfColors.emerald[50],
    borderLeftWidth: 3,
    borderLeftColor: pdfColors.emerald[600],
    borderRadius: 2,
  },
  complianceText: {
    ...pdfTypography.body,
    color: pdfColors.emerald[700],
    fontSize: 9,
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

function getStatusColor(status: string): string {
  switch (status) {
    case "active":
      return pdfColors.emerald[600];
    case "expiring_soon":
      return pdfColors.amber[600];
    case "expired":
      return pdfColors.red[600];
    case "pending_signature":
      return pdfColors.slate[500];
    default:
      return pdfColors.slate[400];
  }
}

function formatType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface ExecutiveSummaryAggregateProps {
  packetName: string;
  baas: BAA[];
  vendorsById: Record<string, Vendor>;
  clinic: Clinic;
  auditLogCount: number;
  generatedAt: string;
  dateFrom: string | null;
  dateTo: string | null;
}

export function ExecutiveSummaryAggregatePDF({
  packetName,
  baas,
  vendorsById,
  clinic,
  auditLogCount,
  generatedAt,
  dateFrom,
  dateTo,
}: ExecutiveSummaryAggregateProps) {
  const counts = baas.reduce(
    (acc, b) => {
      acc.total += 1;
      if (b.status === "active") acc.active += 1;
      else if (b.status === "expiring_soon") acc.expiring += 1;
      else if (b.status === "expired") acc.expired += 1;
      else if (b.status === "pending_signature") acc.pendingSig += 1;
      else if (b.status === "pending_countersignature") acc.pendingCtr += 1;
      return acc;
    },
    { total: 0, active: 0, expiring: 0, expired: 0, pendingSig: 0, pendingCtr: 0 },
  );
  const complianceScore =
    counts.total === 0 ? 0 : Math.round((counts.active / counts.total) * 100);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Cover header */}
        <View style={styles.coverHeader}>
          <Text style={styles.coverTitle}>EXECUTIVE SUMMARY</Text>
          <Text style={styles.coverSubtitle}>{packetName}</Text>
          <Text style={styles.coverDate}>
            Generated: {new Date(generatedAt).toLocaleString("en-US")}
          </Text>
          {(dateFrom || dateTo) && (
            <Text style={styles.coverDate}>
              Review period: {dateFrom ?? "—"} to {dateTo ?? "—"}
            </Text>
          )}
        </View>

        {/* Covered Entity */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Covered Entity</Text>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>ORGANIZATION:</Text>
            <Text style={styles.cardValue}>{clinic.name}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>ADDRESS:</Text>
            <Text style={styles.cardValue}>{clinic.address}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>HIPAA OFFICER:</Text>
            <Text style={styles.cardValue}>{clinic.hipaaOfficer}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>NPI:</Text>
            <Text style={styles.cardValue}>{clinic.npi}</Text>
          </View>
        </View>

        {/* Compliance Posture */}
        <Text style={styles.sectionHeading}>Compliance Posture</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{complianceScore}%</Text>
            <Text style={styles.statLabel}>Compliance Score</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{counts.total}</Text>
            <Text style={styles.statLabel}>Total BAAs</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{counts.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{counts.expiring}</Text>
            <Text style={styles.statLabel}>Expiring Soon</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{counts.expired}</Text>
            <Text style={styles.statLabel}>Expired</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{counts.pendingSig + counts.pendingCtr}</Text>
            <Text style={styles.statLabel}>Pending Signature</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{auditLogCount}</Text>
            <Text style={styles.statLabel}>Audit Events</Text>
          </View>
        </View>

        {/* Vendor Overview */}
        <Text style={styles.sectionHeading}>Vendor Overview</Text>
        <View style={styles.vendorTableHeader} wrap={false}>
          <Text style={[styles.vendorTableHeaderText, styles.colVendor]}>Vendor</Text>
          <Text style={[styles.vendorTableHeaderText, styles.colType]}>Type</Text>
          <Text style={[styles.vendorTableHeaderText, styles.colStatus]}>Status</Text>
          <Text style={[styles.vendorTableHeaderText, styles.colEffective]}>Effective</Text>
          <Text style={[styles.vendorTableHeaderText, styles.colExpires]}>Expires</Text>
        </View>
        {baas.map((baa, index) => {
          const vendor = vendorsById[baa.vendorId];
          return (
            <View
              key={baa.id}
              style={[
                styles.vendorTableRow,
                index % 2 === 1 ? styles.vendorTableRowAlt : {},
              ]}
              wrap={false}
            >
              <Text style={[styles.vendorCell, styles.colVendor]}>
                {vendor?.name ?? "Unknown"}
              </Text>
              <Text style={[styles.vendorCell, styles.colType]}>
                {vendor ? formatType(vendor.type) : "—"}
              </Text>
              <View style={[styles.colStatus]}>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(baa.status) },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {baa.status.replace(/_/g, " ")}
                  </Text>
                </View>
              </View>
              <Text style={[styles.vendorCell, styles.colEffective]}>
                {baa.effectiveDate}
              </Text>
              <Text style={[styles.vendorCell, styles.colExpires]}>
                {baa.expirationDate}
              </Text>
            </View>
          );
        })}

        {/* Compliance note */}
        <View style={styles.complianceNote}>
          <Text style={styles.complianceText}>
            This document package has been generated in compliance with the
            Health Insurance Portability and Accountability Act of 1996 (HIPAA),
            45 CFR Parts 160 and 164, and applicable Mississippi state privacy
            laws (Miss. Code Ann. 41-9-1 et seq.). All BAA records are retained
            for a minimum of six (6) years per federal regulation, with 10-year
            retention applied to medical-records vendors under Miss. Code Ann.
            41-9-69.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            HIPAApotamus — {packetName}
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
