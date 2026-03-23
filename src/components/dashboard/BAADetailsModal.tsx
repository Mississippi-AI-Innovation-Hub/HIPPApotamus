"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AuditLog, BAA, BAAStatus, Vendor } from "@/types";
import { useToast } from "@/components/ui/Toast";

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

// ─── Status Badge ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<BAAStatus, { label: string; bg: string; text: string; dot: string }> = {
  active: { label: "Active", bg: "#DCFCE7", text: "#15803D", dot: "#15803D" },
  expiring_soon: { label: "Expiring Soon", bg: "#FEF3C7", text: "#92400E", dot: "#B45309" },
  expired: { label: "Expired", bg: "#FEE2E2", text: "#991B1B", dot: "#B91C1C" },
  pending_signature: { label: "Pending Signature", bg: "#DBEAFE", text: "#1E40AF", dot: "#1D4ED8" },
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
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                step.active
                  ? "border-[#0F766E] bg-[#0F766E]"
                  : step.reached
                    ? "border-[#0F766E]/40 bg-[#0F766E]/10"
                    : "border-slate-200 bg-slate-50"
              }`}
            >
              {step.reached ? (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={3}
                  stroke={step.active ? "#FFFFFF" : "#0F766E"}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : (
                <span className="h-2 w-2 rounded-full bg-slate-300" />
              )}
            </div>
            <span
              className={`mt-1.5 text-[11px] font-semibold ${
                step.active ? "text-[#0F766E]" : step.reached ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`mb-5 h-0.5 w-8 sm:w-10 rounded-full ${
                steps[i + 1].reached ? "bg-[#0F766E]/30" : "bg-slate-200"
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

// ─── Animation States ───────────────────────────────────────────────────────
type AnimationPhase = "enter-start" | "enter-active" | "exit-active" | "exit-done";

// ─── Component ──────────────────────────────────────────────────────────────

export default function BAADetailsModal({
  baa,
  vendor,
  auditLogs,
  onClose,
}: BAADetailsModalProps) {
  const { addToast } = useToast();

  // Track whether the modal is visible (mounted in DOM) independently of the baa prop
  const [visible, setVisible] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>("enter-start");

  // Keep a ref to the latest baa/vendor so content remains while exit-animating
  const baaRef = useRef<BAA | null>(baa);
  const vendorRef = useRef<Vendor | null>(vendor);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // When baa becomes non-null, mount and kick off enter animation
  useEffect(() => {
    if (baa && vendor) {
      baaRef.current = baa;
      vendorRef.current = vendor;
      setVisible(true);
      setAnimationPhase("enter-start");

      // Trigger enter animation on next frame so the browser paints the initial state first
      const rafId = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimationPhase("enter-active");
        });
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [baa, vendor]);

  // Handle close: run exit animation, then unmount
  const handleClose = useCallback(() => {
    setAnimationPhase("exit-active");
    setTimeout(() => {
      setAnimationPhase("exit-done");
      setVisible(false);
      onCloseRef.current();
    }, 250); // matches exit duration
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!visible) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [visible, handleClose]);

  // Don't render anything if not visible
  if (!visible) return null;

  // Use refs so content stays stable during exit animation
  const currentBaa = baaRef.current!;
  const currentVendor = vendorRef.current!;

  const sortedLogs = [...auditLogs].sort(
    (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
  );

  const handleSendReminder = () => {
    try {
      addToast(`Reminder sent to ${currentVendor.contactEmail}`, "success");
    } catch {
      addToast("Failed to send reminder", "error");
    }
  };

  const handleDownloadPDF = async () => {
    try {
      addToast("Generating PDF...", "info");
      const response = await fetch(`/api/pdf/${currentBaa.id}`);
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BAA-${currentBaa.id}.pdf`;
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
      addToast(`${currentVendor.name} marked for renewal`, "success");
    } catch {
      addToast("Failed to mark for renewal", "error");
    }
  };

  const handleCopySigningLink = () => {
    try {
      const link = `${window.location.origin}/sign/${currentBaa.id}`;
      navigator.clipboard.writeText(link).then(
        () => addToast("Signing link copied to clipboard", "success"),
        () => addToast("Failed to copy link", "error")
      );
    } catch {
      addToast("Failed to copy signing link", "error");
    }
  };

  // Determine classes based on animation phase
  const isOpen = animationPhase === "enter-active";
  const backdropOpacity = isOpen ? "opacity-50" : "opacity-0";
  const panelTranslate = isOpen ? "translate-x-0" : "translate-x-full";

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-foreground backdrop-blur-sm transition-opacity duration-200 ${
          isOpen ? "ease-out" : "ease-in"
        } ${backdropOpacity}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`BAA details for ${currentVendor.name}`}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-card shadow-[-8px_0_24px_rgba(0,0,0,0.12)] ${
          isOpen
            ? "translate-x-0 transition-transform duration-300 ease-out"
            : "translate-x-full transition-transform duration-[250ms] ease-in"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">{currentVendor.name}</h2>
              <p className="text-sm text-muted-foreground">{formatVendorType(currentVendor.type)}</p>
            </div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ backgroundColor: STATUS_CONFIG[currentBaa.status].bg, color: STATUS_CONFIG[currentBaa.status].text }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_CONFIG[currentBaa.status].dot }} />
              {STATUS_CONFIG[currentBaa.status].label}
            </span>
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
              <StatusTimeline status={currentBaa.status} />
            </section>

            <Separator />

            {/* Contract Details */}
            <section>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Contract Details
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <DetailItem label="Effective Date" value={formatDate(currentBaa.effectiveDate)} />
                <DetailItem label="Expiration Date" value={formatDate(currentBaa.expirationDate)} />
                <DetailItem label="Signed Date" value={formatDate(currentBaa.signedDate)} />
                <DetailItem label="Signed By" value={currentBaa.signedBy ?? "--"} />
                <DetailItem label="Template Version" value={currentBaa.templateVersion} mono />
                <DetailItem label="Term" value={`${currentBaa.termYears} year${currentBaa.termYears > 1 ? "s" : ""}`} />
              </div>
              {currentBaa.requiresStateLawRetentionNotice && (
                <div className="mt-3 rounded-lg border border-[#B45309]/20 bg-[#FEF3C7] px-3 py-2 text-xs text-[#B45309]">
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
                <DetailItem label="Contact" value={currentVendor.contactName} />
                <DetailItem label="Email" value={currentVendor.contactEmail} />
                <DetailItem label="Phone" value={currentVendor.contactPhone} />
                <DetailItem label="Address" value={currentVendor.address} />
                <DetailItem
                  label="Breach SLA"
                  value={`${currentVendor.breachNotificationSLADays} days`}
                />
                <DetailItem
                  label="SOC 2 Required"
                  value={currentVendor.requiresSoc2Report ? "Yes" : "No"}
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
            <Button onClick={handleSendReminder} className="bg-[#0F766E] text-white hover:bg-[#0D6560]">
              Send Reminder
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF}>
              Download PDF
            </Button>
            <Button variant="outline" onClick={handleMarkForRenewal}>
              Mark for Renewal
            </Button>
            {currentBaa.status === "pending_signature" && (
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
