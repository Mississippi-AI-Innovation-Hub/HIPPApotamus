"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AuditLog, BAA, Vendor } from "@/types";
import { useToast } from "@/components/ui/Toast";
import PDFPreviewModal from "@/components/dashboard/PDFPreviewModal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuditPacketsPageClientProps {
  vendors: Vendor[];
  baas: BAA[];
  auditLogs: AuditLog[];
}

interface PacketOptions {
  includePDFs: boolean;
  includeAuditTrail: boolean;
  includeExecutiveSummary: boolean;
}

type GenerationStatus = "idle" | "generating" | "complete" | "error";

interface GeneratedPacket {
  id: string;
  name: string;
  date: string;
  contractsIncluded: number;
  size: string;
  status: "complete" | "generating" | "failed";
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getVendorName(vendors: Vendor[], vendorId: string): string {
  const vendor = vendors.find((v) => v.id === vendorId);
  return vendor ? vendor.name : "Unknown Vendor";
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 60) return "1 month ago";
  return `${Math.floor(diffDays / 30)} months ago`;
}

function getStatusBadgeColor(status: BAA["status"]): string {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700";
    case "expiring_soon":
      return "bg-amber-100 text-amber-700";
    case "expired":
      return "bg-red-100 text-red-700";
    case "pending_signature":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatStatusLabel(status: BAA["status"]): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const GENERATION_STEPS = [
  "Collecting contracts...",
  "Building audit trail...",
  "Generating executive summary...",
  "Creating ZIP...",
];

// ─── Demo packets for history table ─────────────────────────────────────────

interface PacketDocument {
  id: string;
  name: string;
  type: "contract" | "audit-trail" | "executive-summary" | "state-addendum";
  size: string;
  vendorName?: string;
  baaId?: string;
}

interface GeneratedPacketWithDocs extends GeneratedPacket {
  documents: PacketDocument[];
}

const DEMO_PACKETS: GeneratedPacketWithDocs[] = [
  {
    id: "pkt-001",
    name: "Compliance Report — February 2026",
    date: "2026-02-28T14:30:00Z",
    contractsIncluded: 5,
    size: "4.2 MB",
    status: "complete",
    documents: [
      { id: "d1", name: "Executive Summary", type: "executive-summary", size: "245 KB" },
      { id: "d2", name: "BAA — CareCloud EHR Systems", type: "contract", size: "890 KB", vendorName: "CareCloud EHR" },
      { id: "d3", name: "BAA — MedBridge Lab Solutions", type: "contract", size: "875 KB", vendorName: "MedBridge Lab" },
      { id: "d4", name: "BAA — DataVault Health Records", type: "contract", size: "910 KB", vendorName: "DataVault Health" },
      { id: "d5", name: "BAA — SecureRx Pharmacy Network", type: "contract", size: "860 KB", vendorName: "SecureRx Pharmacy" },
      { id: "d6", name: "BAA — TeleHealth Connect MS", type: "contract", size: "845 KB", vendorName: "TeleHealth Connect" },
      { id: "d7", name: "Full Audit Trail", type: "audit-trail", size: "320 KB" },
      { id: "d8", name: "MS State Law Addendum (§ 41-9-60)", type: "state-addendum", size: "56 KB" },
    ],
  },
  {
    id: "pkt-002",
    name: "Q4 2025 Audit Packet",
    date: "2026-01-15T09:15:00Z",
    contractsIncluded: 5,
    size: "3.8 MB",
    status: "complete",
    documents: [
      { id: "d9", name: "Executive Summary", type: "executive-summary", size: "210 KB" },
      { id: "d10", name: "BAA — CareCloud EHR Systems", type: "contract", size: "890 KB", vendorName: "CareCloud EHR" },
      { id: "d11", name: "BAA — MedBridge Lab Solutions", type: "contract", size: "875 KB", vendorName: "MedBridge Lab" },
      { id: "d12", name: "Full Audit Trail", type: "audit-trail", size: "290 KB" },
    ],
  },
  {
    id: "pkt-003",
    name: "Annual Review — 2025",
    date: "2025-12-31T16:45:00Z",
    contractsIncluded: 5,
    size: "6.1 MB",
    status: "complete",
    documents: [
      { id: "d13", name: "Executive Summary", type: "executive-summary", size: "380 KB" },
      { id: "d14", name: "All Contract PDFs (5)", type: "contract", size: "4.2 MB" },
      { id: "d15", name: "Full Audit Trail", type: "audit-trail", size: "510 KB" },
      { id: "d16", name: "MS State Law Addendum (§ 41-9-60)", type: "state-addendum", size: "56 KB" },
    ],
  },
  {
    id: "pkt-004",
    name: "Compliance Report — November 2025",
    date: "2025-11-30T11:00:00Z",
    contractsIncluded: 3,
    size: "2.7 MB",
    status: "failed",
    documents: [],
  },
];

const DOC_TYPE_ICONS: Record<PacketDocument["type"], { color: string; bg: string; icon: string }> = {
  contract: { color: "#0F766E", bg: "#CCFBF1", icon: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" },
  "audit-trail": { color: "#1D4ED8", bg: "#DBEAFE", icon: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" },
  "executive-summary": { color: "#15803D", bg: "#DCFCE7", icon: "M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" },
  "state-addendum": { color: "#CA8A04", bg: "#FEFCE8", icon: "M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function AuditPacketsPageClient({
  vendors,
  baas,
  auditLogs,
}: AuditPacketsPageClientProps) {
  const { addToast } = useToast();

  // ── Generation form state ──
  const now = new Date();
  const defaultName = `Compliance Report — ${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`;
  const [packetName, setPacketName] = useState(defaultName);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedBAAIds, setSelectedBAAIds] = useState<Set<string>>(new Set());
  const [options, setOptions] = useState<PacketOptions>({
    includePDFs: true,
    includeAuditTrail: true,
    includeExecutiveSummary: true,
  });
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [packets, setPackets] = useState<GeneratedPacketWithDocs[]>([]);
  const [previewBaaId, setPreviewBaaId] = useState<string | null>(null);
  const [previewVendorName, setPreviewVendorName] = useState("");
  const [expandedPacketId, setExpandedPacketId] = useState<string | null>(null);

  // Ref for scrolling to generation section
  const generateSectionRef = useRef<HTMLDivElement>(null);

  // ── Computed values ──
  const activeBAAs = useMemo(
    () => baas.filter((b) => b.status === "active").length,
    [baas]
  );

  const complianceScore = useMemo(() => {
    if (baas.length === 0) return 0;
    return Math.round((activeBAAs / baas.length) * 100);
  }, [activeBAAs, baas.length]);

  const totalDocumentation = useMemo(
    () => ({
      contracts: baas.length,
      auditEvents: auditLogs.length,
    }),
    [baas.length, auditLogs.length]
  );

  const lastAudit = useMemo(() => {
    if (auditLogs.length === 0) return null;
    const sorted = [...auditLogs].sort(
      (a, b) =>
        new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
    );
    return sorted[0];
  }, [auditLogs]);

  const scoreColor = useMemo(() => {
    if (complianceScore > 80) return { ring: "#15803D", text: "text-emerald-700", bg: "bg-emerald-50" };
    if (complianceScore >= 50) return { ring: "#CA8A04", text: "text-amber-700", bg: "bg-amber-50" };
    return { ring: "#DC2626", text: "text-red-700", bg: "bg-red-50" };
  }, [complianceScore]);

  // ── Actions ──
  const allSelected = selectedBAAIds.size === baas.length && baas.length > 0;

  const toggleBAA = (id: string) => {
    setSelectedBAAIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => setSelectedBAAIds(new Set(baas.map((b) => b.id)));
  const deselectAll = () => setSelectedBAAIds(new Set());

  const handleGenerate = useCallback(async () => {
    if (selectedBAAIds.size === 0) {
      addToast("Please select at least one contract", "warning");
      return;
    }

    setStatus("generating");
    setProgress(0);
    setProgressMessage(GENERATION_STEPS[0]);

    try {
      const totalSteps = 12;
      for (let i = 1; i <= totalSteps; i++) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const pct = Math.round((i / totalSteps) * 100);
        setProgress(pct);
        // Update message based on progress
        if (pct <= 25) setProgressMessage(GENERATION_STEPS[0]);
        else if (pct <= 50) setProgressMessage(GENERATION_STEPS[1]);
        else if (pct <= 75) setProgressMessage(GENERATION_STEPS[2]);
        else setProgressMessage(GENERATION_STEPS[3]);
      }

      // Add new packet to history
      const packetId = `pkt-${Date.now()}`;
      const newPacket: GeneratedPacketWithDocs = {
        id: packetId,
        name: packetName,
        date: new Date().toISOString(),
        contractsIncluded: selectedBAAIds.size,
        size: `${(selectedBAAIds.size * 0.8 + 1.2).toFixed(1)} MB`,
        status: "complete",
        documents: [
          ...(options.includeExecutiveSummary ? [{ id: `${packetId}-exec`, name: "Executive Summary", type: "executive-summary" as const, size: "245 KB" }] : []),
          ...Array.from(selectedBAAIds).map((baaId) => {
            const baa = baas.find((b) => b.id === baaId);
            const vendor = baa ? vendors.find((v) => v.id === baa.vendorId) : null;
            return { id: `${packetId}-${baaId}`, name: `BAA — ${vendor?.name ?? baaId}`, type: "contract" as const, size: "890 KB", vendorName: vendor?.name, baaId };
          }),
          ...(options.includeAuditTrail ? [{ id: `${packetId}-trail`, name: "Full Audit Trail", type: "audit-trail" as const, size: "320 KB" }] : []),
        ],
      };
      setPackets((prev) => [newPacket, ...prev]);

      setStatus("complete");
      addToast("Audit packet generated successfully", "success");
    } catch {
      setStatus("error");
      addToast("Failed to generate audit packet", "error");
    }
  }, [selectedBAAIds, packetName, addToast]);

  const handleDownload = useCallback(() => {
    addToast("Downloading audit packet...", "info");
    // In production, this would trigger an S3 download
  }, [addToast]);

  const handleReset = useCallback(() => {
    setStatus("idle");
    setProgress(0);
    setProgressMessage("");
    setSelectedBAAIds(new Set());
    const resetNow = new Date();
    setPacketName(
      `Compliance Report — ${resetNow.toLocaleString("default", { month: "long" })} ${resetNow.getFullYear()}`
    );
    setDateFrom("");
    setDateTo("");
  }, []);

  const handleDeletePacket = useCallback(
    (id: string) => {
      setPackets((prev) => prev.filter((p) => p.id !== id));
      addToast("Packet deleted", "info");
    },
    [addToast]
  );

  const scrollToGenerate = useCallback(() => {
    generateSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Set default date range on mount
  useEffect(() => {
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setDateFrom(firstOfMonth.toISOString().split("T")[0]);
    setDateTo(today.toISOString().split("T")[0]);
  }, []);

  return (
    <div className="space-y-8 px-8 py-8">
      {/* ── Section 1: Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "'Satoshi', sans-serif" }}
          >
            Audit Packets
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            Generate and manage HIPAA compliance documentation
          </p>
        </div>
        <Button
          onClick={scrollToGenerate}
          className="bg-[#0F766E] text-white hover:bg-[#0D6560]"
          size="lg"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Generate New Packet
        </Button>
      </div>

      {/* ── Section 2: Compliance Overview Cards ── */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Compliance Score */}
        <Card className="shadow-premium">
          <CardHeader>
            <CardDescription>Compliance Score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              {/* Circular progress ring */}
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-slate-100"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke={scoreColor.ring}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${(complianceScore / 100) * 2 * Math.PI * 34} ${2 * Math.PI * 34}`}
                    className="transition-all duration-700"
                  />
                </svg>
                <span
                  className={`absolute text-xl font-bold ${scoreColor.text}`}
                  style={{ fontFamily: "'Satoshi', sans-serif" }}
                >
                  {complianceScore}%
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {activeBAAs} of {baas.length} BAAs active
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {complianceScore > 80
                    ? "Excellent compliance posture"
                    : complianceScore >= 50
                      ? "Review expiring contracts"
                      : "Immediate attention required"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Documentation */}
        <Card className="shadow-premium">
          <CardHeader>
            <CardDescription>Total Documentation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0F766E]/10">
                <svg
                  className="h-6 w-6 text-[#0F766E]"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                  {totalDocumentation.contracts + totalDocumentation.auditEvents}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {totalDocumentation.contracts} contracts documented
                </p>
                <p className="text-xs text-muted-foreground">
                  {totalDocumentation.auditEvents} audit events recorded
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last Audit */}
        <Card className="shadow-premium">
          <CardHeader>
            <CardDescription>Last Audit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                <svg
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              </div>
              <div>
                {lastAudit ? (
                  <>
                    <p
                      className="text-2xl font-bold text-foreground"
                      style={{ fontFamily: "'Satoshi', sans-serif" }}
                    >
                      {formatRelativeTime(lastAudit.performedAt)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {lastAudit.action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      by {lastAudit.performedBy}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold text-muted-foreground">
                      No audit events
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Actions will appear here
                    </p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Section 3: Generate New Packet ── */}
      <div ref={generateSectionRef}>
        <Card className="shadow-premium">
          <CardHeader>
            <CardTitle
              className="text-lg font-bold"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-[#0F766E]"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                  />
                </svg>
                Generate Compliance Packet
              </div>
            </CardTitle>
            <CardDescription>
              Build a comprehensive compliance documentation package including
              contracts, audit trails, and executive summaries for regulatory
              review.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-6">
              {/* Packet name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Packet Name
                </label>
                <Input
                  value={packetName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPacketName(e.target.value)
                  }
                  placeholder="Compliance Report — March 2026"
                  className="max-w-lg"
                  disabled={status === "generating"}
                />
              </div>

              {/* Date range */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Date Range
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDateFrom(e.target.value)
                    }
                    className="w-44"
                    disabled={status === "generating"}
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDateTo(e.target.value)
                    }
                    className="w-44"
                    disabled={status === "generating"}
                  />
                </div>
              </div>

              <Separator />

              {/* Vendor/contract selection */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    Select Contracts
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAll}
                      disabled={status === "generating"}
                      className="text-xs font-medium text-[#0F766E] transition-colors hover:text-[#0D6560] disabled:opacity-50"
                    >
                      Select All
                    </button>
                    <span className="text-xs text-muted-foreground">|</span>
                    <button
                      type="button"
                      onClick={deselectAll}
                      disabled={status === "generating"}
                      className="text-xs font-medium text-[#0F766E] transition-colors hover:text-[#0D6560] disabled:opacity-50"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {baas.map((baa) => {
                    const isSelected = selectedBAAIds.has(baa.id);
                    return (
                      <label
                        key={baa.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${
                          isSelected
                            ? "border-[#0F766E]/30 bg-[#0F766E]/5"
                            : "border-border hover:border-[#0F766E]/20 hover:bg-muted/50"
                        } ${status === "generating" ? "pointer-events-none opacity-60" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleBAA(baa.id)}
                          disabled={status === "generating"}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]/20"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {getVendorName(vendors, baa.vendorId)}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusBadgeColor(baa.status)}`}
                            >
                              {formatStatusLabel(baa.status)}
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })}

                  {baas.length === 0 && (
                    <div className="col-span-full rounded-lg border border-dashed border-border p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        No BAA contracts found. Add vendors to get started.
                      </p>
                    </div>
                  )}
                </div>

                {selectedBAAIds.size > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {selectedBAAIds.size} contract
                    {selectedBAAIds.size !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>

              <Separator />

              {/* Include options */}
              <div>
                <label className="mb-3 block text-sm font-medium text-foreground">
                  Include in Packet
                </label>
                <div className="space-y-2">
                  <OptionToggle
                    label="Include Contract PDFs"
                    description="Signed BAA documents for each selected vendor"
                    checked={options.includePDFs}
                    onChange={(v) =>
                      setOptions({ ...options, includePDFs: v })
                    }
                    disabled={status === "generating"}
                  />
                  <OptionToggle
                    label="Include Audit Trail"
                    description="Chronological log of all compliance actions and events"
                    checked={options.includeAuditTrail}
                    onChange={(v) =>
                      setOptions({ ...options, includeAuditTrail: v })
                    }
                    disabled={status === "generating"}
                  />
                  <OptionToggle
                    label="Include Executive Summary"
                    description="One-page overview of compliance posture and vendor status"
                    checked={options.includeExecutiveSummary}
                    onChange={(v) =>
                      setOptions({ ...options, includeExecutiveSummary: v })
                    }
                    disabled={status === "generating"}
                  />
                </div>
              </div>

              {/* Progress / completion / error states */}
              {status === "generating" && (
                <div className="rounded-lg border border-[#0F766E]/20 bg-[#CCFBF1]/50 px-5 py-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-[#0F766E]">
                      {progressMessage}
                    </span>
                    <span className="font-mono text-sm font-bold text-[#0F766E]">
                      {progress}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#0F766E]/10">
                    <div
                      className="h-full rounded-full bg-[#0F766E] transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {status === "complete" && (
                <div className="rounded-lg border border-[#15803D]/20 bg-[#DCFCE7]/50 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <svg
                      className="h-8 w-8 text-[#15803D]"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#15803D]">
                        Audit packet ready for download
                      </p>
                      <p className="text-xs text-[#15803D]/80">
                        {selectedBAAIds.size} contract
                        {selectedBAAIds.size !== 1 ? "s" : ""} included
                        {options.includeAuditTrail ? " with audit trail" : ""}
                        {options.includeExecutiveSummary
                          ? " and executive summary"
                          : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleDownload}
                        className="bg-[#15803D] text-white hover:bg-[#166534]"
                        size="default"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                          />
                        </svg>
                        Download
                      </Button>
                      <Button
                        onClick={handleReset}
                        variant="outline"
                        size="default"
                      >
                        New Packet
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <svg
                      className="h-6 w-6 text-red-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-700">
                        Generation failed. Please try again.
                      </p>
                    </div>
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      size="default"
                      className="border-red-200 text-red-700 hover:bg-red-50"
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              )}

              {/* Generate button */}
              {(status === "idle" || status === "error") && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleGenerate}
                    className="bg-[#0F766E] text-white hover:bg-[#0D6560]"
                    size="lg"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                      />
                    </svg>
                    Generate Packet
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Section 4: Generated Packets History ── */}
      <Card className="shadow-premium">
        <CardHeader>
          <CardTitle
            className="text-lg font-bold"
            style={{ fontFamily: "'Satoshi', sans-serif" }}
          >
            Generated Packets
          </CardTitle>
          <CardDescription>
            Previously generated compliance documentation packages
          </CardDescription>
        </CardHeader>
        <CardContent>
          {packets.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No packets generated yet. Create your first compliance packet
                above.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Contracts</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packets.map((packet) => {
                  const isExpanded = expandedPacketId === packet.id;
                  return (
                    <React.Fragment key={packet.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => setExpandedPacketId(isExpanded ? null : packet.id)}
                      >
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <svg
                              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                            </svg>
                            {packet.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(packet.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {packet.contractsIncluded}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {packet.size}
                        </TableCell>
                        <TableCell>
                          <PacketStatusBadge status={packet.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            {packet.status === "complete" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => addToast(`Downloading ${packet.name}...`, "info")}
                                title="Download entire packet"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePacket(packet.id)}
                              className="text-muted-foreground hover:text-red-600"
                              title="Delete packet"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded document list */}
                      {isExpanded && packet.documents.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/20 p-0">
                            <div className="px-6 py-4">
                              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                Documents in this packet ({packet.documents.length})
                              </p>
                              <div className="space-y-1.5">
                                {packet.documents.map((doc) => {
                                  const typeConfig = DOC_TYPE_ICONS[doc.type];
                                  return (
                                    <div
                                      key={doc.id}
                                      className="flex items-center gap-3 rounded-lg border border-border/50 bg-background px-3 py-2.5 transition-colors hover:bg-muted/30"
                                    >
                                      <div
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                        style={{ backgroundColor: typeConfig.bg }}
                                      >
                                        <svg
                                          className="h-4 w-4"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          strokeWidth={1.5}
                                          stroke="currentColor"
                                          style={{ color: typeConfig.color }}
                                        >
                                          <path strokeLinecap="round" strokeLinejoin="round" d={typeConfig.icon} />
                                        </svg>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                                        {doc.vendorName && (
                                          <p className="text-xs text-muted-foreground">{doc.vendorName}</p>
                                        )}
                                      </div>
                                      <span className="font-mono text-xs text-muted-foreground">{doc.size}</span>
                                      {doc.type === "contract" && doc.baaId && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewBaaId(doc.baaId!);
                                            setPreviewVendorName(doc.vendorName ?? doc.name);
                                          }}
                                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                                          title={`Preview ${doc.name}`}
                                        >
                                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                          </svg>
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (doc.type === "contract" && doc.baaId) {
                                            // Download real PDF for contract documents
                                            fetch(`/api/pdf/${doc.baaId}`)
                                              .then(res => res.blob())
                                              .then(blob => {
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement("a");
                                                a.href = url;
                                                a.download = `${doc.name}.pdf`;
                                                a.click();
                                                URL.revokeObjectURL(url);
                                                addToast(`Downloaded ${doc.name}`, "success");
                                              })
                                              .catch(() => addToast(`Failed to download ${doc.name}`, "error"));
                                          } else {
                                            addToast(`${doc.name} is not yet available for download`, "warning");
                                          }
                                        }}
                                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                        title={`Download ${doc.name}`}
                                      >
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                        </svg>
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}

                      {isExpanded && packet.documents.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/20">
                            <p className="py-4 text-center text-sm text-muted-foreground">
                              No documents available — this packet failed to generate.
                            </p>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* PDF Preview Modal */}
      {previewBaaId && (
        <PDFPreviewModal
          baaId={previewBaaId}
          vendorName={previewVendorName}
          onClose={() => { setPreviewBaaId(null); setPreviewVendorName(""); }}
        />
      )}

      {/* ── Section 5: What's Included ── */}
      <Card className="shadow-premium">
        <CardHeader>
          <CardTitle
            className="text-lg font-bold"
            style={{ fontFamily: "'Satoshi', sans-serif" }}
          >
            What&apos;s Included in an Audit Packet
          </CardTitle>
          <CardDescription>
            Each packet is a comprehensive compliance artifact ready for
            regulatory review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <IncludedItem
              icon={
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605"
                />
              }
              title="Executive Summary"
              description="Clinic information, overall compliance score, vendor overview, and key findings at a glance."
              color="#0F766E"
            />
            <IncludedItem
              icon={
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              }
              title="Contract PDFs"
              description="All selected BAA documents with executed signatures, terms, and compliance obligations."
              color="#1D4ED8"
            />
            <IncludedItem
              icon={
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
                />
              }
              title="Audit Trail"
              description="Chronological log of all compliance actions, contract modifications, and system events."
              color="#7C3AED"
            />
            <IncludedItem
              icon={
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z"
                />
              }
              title="Mississippi State Law Addendum"
              description="Retention requirements per MS Code &sect; 41-9-60, ensuring state-specific compliance for all medical records."
              color="#CA8A04"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function OptionToggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border border-border px-4 py-3 transition-all ${
        checked ? "border-[#0F766E]/20 bg-[#0F766E]/5" : "hover:bg-muted/50"
      } ${disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]/20"
      />
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </label>
  );
}

function PacketStatusBadge({
  status,
}: {
  status: "complete" | "generating" | "failed";
}) {
  const styles = {
    complete: "bg-emerald-100 text-emerald-700",
    generating: "bg-blue-100 text-blue-700 animate-pulse",
    failed: "bg-red-100 text-red-700",
  };

  const labels = {
    complete: "Complete",
    generating: "Generating",
    failed: "Failed",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status === "complete" && (
        <svg
          className="mr-1 h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m4.5 12.75 6 6 9-13.5"
          />
        </svg>
      )}
      {labels[status]}
    </span>
  );
}

function IncludedItem({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/30">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}15` }}
      >
        <svg
          className="h-5 w-5"
          style={{ color }}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          {icon}
        </svg>
      </div>
      <div>
        <p
          className="text-sm font-semibold text-foreground"
          style={{ fontFamily: "'Satoshi', sans-serif" }}
        >
          {title}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
