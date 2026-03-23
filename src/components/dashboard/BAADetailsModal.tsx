"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuditLog, BAA, BAAStatus, Vendor } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// ─── Types ──────────────────────────────────────────────────────────────────

interface BAADetailsModalProps {
  baa: BAA | null;
  vendor: Vendor | null;
  auditLogs: AuditLog[];
  onClose: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTimestamp(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function formatVendorType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── Status Badge Variant ───────────────────────────────────────────────────

const STATUS_BADGE_VARIANT: Record<BAAStatus, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  expiring_soon: "outline",
  expired: "destructive",
  pending_signature: "secondary",
};

const STATUS_LABELS: Record<BAAStatus, string> = {
  active: "Active",
  expiring_soon: "Expiring Soon",
  expired: "Expired",
  pending_signature: "Pending Signature",
};

// ─── Status Timeline ────────────────────────────────────────────────────────

interface TimelineStep {
  label: string;
  reached: boolean;
  active: boolean;
}

function getTimelineSteps(status: BAAStatus): TimelineStep[] {
  const order: BAAStatus[] = ["pending_signature", "active", "expiring_soon", "expired"];
  const currentIdx = order.indexOf(status);

  return [
    { label: "Created", reached: true, active: false },
    { label: "Sent", reached: true, active: false },
    { label: "Signed", reached: currentIdx >= 1, active: status === "active" },
    { label: "Expiring", reached: currentIdx >= 2, active: status === "expiring_soon" },
    { label: "Expired", reached: currentIdx >= 3, active: status === "expired" },
  ];
}

function StatusTimeline({ status }: { status: BAAStatus }) {
  const steps = getTimelineSteps(status);

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                step.active
                  ? "border-primary bg-primary text-primary-foreground"
                  : step.reached
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-muted text-muted-foreground"
              }`}
            >
              {step.reached ? (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`mt-1 text-[10px] font-medium ${
                step.active ? "text-primary" : step.reached ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`mb-4 h-0.5 w-6 sm:w-8 ${
                steps[i + 1].reached ? "bg-primary/40" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── AI Chat Placeholder ────────────────────────────────────────────────────

function AIChatPlaceholder() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-muted">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
          </svg>
          <span className="text-sm font-medium text-foreground">AI Contract Assistant</span>
        </div>
        <svg
          className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {expanded && (
        <div className="border-t border-border px-4 py-6 text-center">
          <svg className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
          </svg>
          <p className="text-sm text-muted-foreground">
            AI-powered contract analysis coming in a future release.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ask questions about terms, compliance requirements, and renewal history.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function BAADetailsModal({
  baa,
  vendor,
  auditLogs,
  onClose,
}: BAADetailsModalProps) {
  const { addToast } = useToast();
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleClose]);

  if (!baa || !vendor) return null;

  const sortedLogs = [...auditLogs].sort(
    (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
  );

  const handleSendReminder = () => {
    try {
      addToast(`Reminder sent to ${vendor.contactEmail}`, "success");
    } catch {
      addToast("Failed to send reminder", "error");
    }
  };

  const handleDownloadPDF = async () => {
    try {
      addToast("Generating PDF...", "info");
      const response = await fetch(`/api/pdf/${baa.id}`);
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BAA-${baa.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast("PDF downloaded", "success");
    } catch {
      addToast("Failed to generate PDF. PDF service may not be available.", "error");
    }
  };

  const handleMarkForRenewal = () => {
    try {
      addToast(`${vendor.name} marked for renewal`, "success");
    } catch {
      addToast("Failed to mark for renewal", "error");
    }
  };

  const handleCopySigningLink = () => {
    try {
      const link = `${window.location.origin}/sign/${baa.id}`;
      navigator.clipboard.writeText(link).then(
        () => addToast("Signing link copied to clipboard", "success"),
        () => addToast("Failed to copy link", "error")
      );
    } catch {
      addToast("Failed to copy signing link", "error");
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-foreground/60 backdrop-blur-sm transition-opacity duration-300 ${
          isClosing ? "opacity-0" : "opacity-100"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`BAA details for ${vendor.name}`}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-card shadow-2xl transition-transform duration-300 ${
          isClosing ? "translate-x-full" : "translate-x-0"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">{vendor.name}</h2>
              <p className="text-sm text-muted-foreground">{formatVendorType(vendor.type)}</p>
            </div>
            <Badge variant={STATUS_BADGE_VARIANT[baa.status]}>
              {STATUS_LABELS[baa.status]}
            </Badge>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close panel"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            {/* Status Timeline */}
            <section>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Contract Status
              </h3>
              <StatusTimeline status={baa.status} />
            </section>

            <Separator />

            {/* Contract Details */}
            <section>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Contract Details
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <DetailItem label="Effective Date" value={formatDate(baa.effectiveDate)} />
                <DetailItem label="Expiration Date" value={formatDate(baa.expirationDate)} />
                <DetailItem label="Signed Date" value={formatDate(baa.signedDate)} />
                <DetailItem label="Signed By" value={baa.signedBy ?? "--"} />
                <DetailItem label="Template Version" value={baa.templateVersion} mono />
                <DetailItem label="Term" value={`${baa.termYears} year${baa.termYears > 1 ? "s" : ""}`} />
              </div>
              {baa.requiresStateLawRetentionNotice && (
                <div className="mt-3 rounded-lg border border-warning/20 bg-warning-light px-3 py-2 text-xs text-warning">
                  <strong>MS State Law:</strong> This vendor requires 10-year medical records retention notice per Mississippi state law.
                </div>
              )}
            </section>

            <Separator />

            {/* Vendor Info */}
            <section>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Vendor Information
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <DetailItem label="Contact" value={vendor.contactName} />
                <DetailItem label="Email" value={vendor.contactEmail} />
                <DetailItem label="Phone" value={vendor.contactPhone} />
                <DetailItem label="Address" value={vendor.address} />
                <DetailItem
                  label="Breach SLA"
                  value={`${vendor.breachNotificationSLADays} days`}
                />
                <DetailItem
                  label="SOC 2 Required"
                  value={vendor.requiresSoc2Report ? "Yes" : "No"}
                />
              </div>
            </section>

            <Separator />

            {/* Audit Trail */}
            <section>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Audit Trail
              </h3>
              {sortedLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No audit events recorded.</p>
              ) : (
                <div className="space-y-2">
                  {sortedLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
                    >
                      <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{log.action}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {formatTimestamp(log.performedAt)} &middot; {log.performedBy}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* AI Chat */}
            <section>
              <AIChatPlaceholder />
            </section>
          </div>
        </div>

        {/* Footer — Actions */}
        <div className="border-t border-border bg-muted px-6 py-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSendReminder}>
              Send Reminder
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF}>
              Download PDF
            </Button>
            <Button variant="outline" onClick={handleMarkForRenewal}>
              Mark for Renewal
            </Button>
            {baa.status === "pending_signature" && (
              <Button
                variant="outline"
                onClick={handleCopySigningLink}
                className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/20"
              >
                Copy Signing Link
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Detail Item ────────────────────────────────────────────────────────────

function DetailItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 text-sm font-medium text-foreground ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
