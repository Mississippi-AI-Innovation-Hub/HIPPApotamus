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
    fontSize: 28,
    fontWeight: "bold",
    color: pdfColors.white,
    textAlign: "center",
  },
  coverSubtitle: {
    fontSize: 14,
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
  infoCard: {
    backgroundColor: pdfColors.slate[50],
    borderWidth: 1,
    borderColor: pdfColors.slate[200],
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
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
    marginBottom: 4,
  },
  cardLabel: {
    ...pdfTypography.label,
    width: 160,
  },
  cardValue: {
    ...pdfTypography.body,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 9,
    fontWeight: "bold",
    color: pdfColors.white,
    textTransform: "uppercase",
  },
  complianceNote: {
    marginTop: 24,
    padding: 12,
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

interface ExecutiveSummaryPDFProps {
  baa: BAA;
  vendor: Vendor;
  clinic: Clinic;
  generatedAt: string;
  auditLogCount: number;
}

export function ExecutiveSummaryPDF({
  baa,
  vendor,
  clinic,
  generatedAt,
  auditLogCount,
}: ExecutiveSummaryPDFProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Cover header */}
        <View style={styles.coverHeader}>
          <Text style={styles.coverTitle}>EXECUTIVE SUMMARY</Text>
          <Text style={styles.coverSubtitle}>
            Business Associate Agreement Compliance Packet
          </Text>
          <Text style={styles.coverDate}>Generated: {generatedAt}</Text>
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
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>CONTACT:</Text>
            <Text style={styles.cardValue}>
              {clinic.contactName} ({clinic.contactEmail})
            </Text>
          </View>
        </View>

        {/* Business Associate */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Business Associate</Text>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>ORGANIZATION:</Text>
            <Text style={styles.cardValue}>{vendor.name}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>TYPE:</Text>
            <Text style={styles.cardValue}>
              {vendor.type.replace(/_/g, " ").toUpperCase()}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>CONTACT:</Text>
            <Text style={styles.cardValue}>
              {vendor.contactName} ({vendor.contactEmail})
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>BREACH SLA:</Text>
            <Text style={styles.cardValue}>
              {vendor.breachNotificationSLADays} days
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>SOC 2 REQUIRED:</Text>
            <Text style={styles.cardValue}>
              {vendor.requiresSoc2Report ? "Yes" : "No"}
            </Text>
          </View>
        </View>

        {/* Agreement details */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Agreement Details</Text>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>BAA REFERENCE:</Text>
            <Text style={styles.cardValue}>{baa.id}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>CONTRACT TYPE:</Text>
            <Text style={styles.cardValue}>
              {baa.contractType.replace(/_/g, " ").toUpperCase()}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>STATUS:</Text>
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
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>EFFECTIVE DATE:</Text>
            <Text style={styles.cardValue}>{baa.effectiveDate}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>EXPIRATION DATE:</Text>
            <Text style={styles.cardValue}>{baa.expirationDate}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>TERM:</Text>
            <Text style={styles.cardValue}>
              {baa.termYears} year{baa.termYears > 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>TEMPLATE VERSION:</Text>
            <Text style={styles.cardValue}>{baa.templateVersion}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>DOCUMENT SOURCE:</Text>
            <Text style={styles.cardValue}>
              {baa.source === "uploaded"
                ? `Vendor-supplied (legal-reviewed by ${baa.legalReviewedBy ?? "pending"})`
                : "Platform-generated from MSDH template"}
            </Text>
          </View>
          {baa.signedDate && (
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>SIGNED:</Text>
              <Text style={styles.cardValue}>
                {baa.signedDate} by {baa.signedBy}
              </Text>
            </View>
          )}
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>AUDIT EVENTS:</Text>
            <Text style={styles.cardValue}>{auditLogCount}</Text>
          </View>
        </View>

        {/* Compliance note */}
        <View style={styles.complianceNote}>
          <Text style={styles.complianceText}>
            This document package has been generated in compliance with the
            Health Insurance Portability and Accountability Act of 1996 (HIPAA),
            45 CFR Parts 160 and 164, and applicable Mississippi state privacy
            laws (Miss. Code Ann. 41-9-1 et seq.). All BAA records are retained
            for a minimum of six (6) years per federal regulation.
            {baa.requiresStateLawRetentionNotice
              ? " Additionally, Mississippi state law requires 10-year retention for medical records (Miss. Code Ann. 41-9-69)."
              : ""}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            HIPAApotamus — Confidential Executive Summary
          </Text>
          <Text style={styles.footerText}>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  );
}
