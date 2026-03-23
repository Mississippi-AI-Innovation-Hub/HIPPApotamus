"use client";

import { useCallback, useEffect, useState } from "react";
import type { BAA, Vendor } from "@/types";
import { useToast } from "@/components/ui/Toast";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuditPacketModalProps {
  open: boolean;
  vendors: Vendor[];
  baas: BAA[];
  onClose: () => void;
}

interface PacketOptions {
  includePDFs: boolean;
  includeAuditTrail: boolean;
  includeExecutiveSummary: boolean;
}

type GenerationStatus = "idle" | "generating" | "complete" | "error";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getVendorName(vendors: Vendor[], vendorId: string): string {
  const vendor = vendors.find((v) => v.id === vendorId);
  return vendor ? vendor.name : "Unknown Vendor";
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AuditPacketModal({
  open,
  vendors,
  baas,
  onClose,
}: AuditPacketModalProps) {
  const { addToast } = useToast();
  const [isClosing, setIsClosing] = useState(false);
  const [selectedBAAIds, setSelectedBAAIds] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [options, setOptions] = useState<PacketOptions>({
    includePDFs: true,
    includeAuditTrail: true,
    includeExecutiveSummary: true,
  });
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [progress, setProgress] = useState(0);

  // Reset state when the modal opens. React 19 auto-batches these setState calls.
  useEffect(() => {
    if (!open) return;
    // Use queueMicrotask to defer setState out of the synchronous effect body
    queueMicrotask(() => {
      setSelectedBAAIds(new Set());
      setDateFrom("");
      setDateTo("");
      setOptions({
        includePDFs: true,
        includeAuditTrail: true,
        includeExecutiveSummary: true,
      });
      setStatus("idle");
      setProgress(0);
      setIsClosing(false);
    });
  }, [open]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, handleClose]);

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

  const toggleAll = () => {
    if (selectedBAAIds.size === baas.length) {
      setSelectedBAAIds(new Set());
    } else {
      setSelectedBAAIds(new Set(baas.map((b) => b.id)));
    }
  };

  const handleGenerate = async () => {
    if (selectedBAAIds.size === 0) {
      addToast("Please select at least one contract", "warning");
      return;
    }

    setStatus("generating");
    setProgress(0);

    try {
      // Simulate generation progress
      const steps = 10;
      for (let i = 1; i <= steps; i++) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        setProgress(Math.round((i / steps) * 100));
      }
      setStatus("complete");
      addToast("Audit packet generated successfully", "success");
    } catch {
      setStatus("error");
      addToast("Failed to generate audit packet", "error");
    }
  };

  const handleDownload = () => {
    try {
      addToast("Downloading audit packet...", "info");
      // In production, this would trigger an S3 download
    } catch {
      addToast("Failed to download packet", "error");
    }
  };

  if (!open) return null;

  const allSelected = selectedBAAIds.size === baas.length && baas.length > 0;
  const someSelected = selectedBAAIds.size > 0 && selectedBAAIds.size < baas.length;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/50 transition-opacity duration-200 ${
          isClosing ? "opacity-0" : "opacity-100"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Generate audit packet"
          className={`flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl transition-all duration-200 ${
            isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Generate Audit Packet</h2>
              <p className="text-sm text-slate-500">
                Create a compliance documentation package for review
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close dialog"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body — scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-6">
              {/* Contract selection */}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Select Contracts
                  </h3>
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-xs font-medium text-[#0F766E] transition-colors hover:text-[#0F766E]"
                  >
                    {allSelected ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                  {/* Select all row */}
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]/20"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      All Contracts ({baas.length})
                    </span>
                  </label>

                  <div className="border-t border-slate-100" />

                  {baas.map((baa) => (
                    <label
                      key={baa.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBAAIds.has(baa.id)}
                        onChange={() => toggleBAA(baa.id)}
                        className="h-4 w-4 rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]/20"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-slate-700">
                          {getVendorName(vendors, baa.vendorId)}
                        </p>
                        <p className="text-xs text-slate-400">
                          {baa.contractType.replace(/_/g, " ")}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </section>

              {/* Date range */}
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Date Range
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">From</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/10"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">To</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/10"
                    />
                  </label>
                </div>
              </section>

              {/* Options */}
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Include in Packet
                </h3>
                <div className="space-y-2">
                  <OptionToggle
                    label="Signed PDF Documents"
                    description="Include the executed BAA PDFs for each selected contract"
                    checked={options.includePDFs}
                    onChange={(v) => setOptions({ ...options, includePDFs: v })}
                  />
                  <OptionToggle
                    label="Audit Trail"
                    description="Full chronological log of all contract events and actions"
                    checked={options.includeAuditTrail}
                    onChange={(v) => setOptions({ ...options, includeAuditTrail: v })}
                  />
                  <OptionToggle
                    label="Executive Summary"
                    description="One-page overview of contract statuses and compliance posture"
                    checked={options.includeExecutiveSummary}
                    onChange={(v) =>
                      setOptions({ ...options, includeExecutiveSummary: v })
                    }
                  />
                </div>
              </section>

              {/* Progress */}
              {status === "generating" && (
                <section>
                  <div className="rounded-lg border border-[#0F766E]/20 bg-[#CCFBF1] px-4 py-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-[#0F766E]">
                        Generating packet...
                      </span>
                      <span className="text-sm font-bold text-[#0F766E]">{progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#CCFBF1]">
                      <div
                        className="h-full rounded-full bg-[#0F766E] transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-[#0F766E]">
                      Compiling documents and generating reports...
                    </p>
                  </div>
                </section>
              )}

              {/* Complete */}
              {status === "complete" && (
                <section>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
                    <svg className="mx-auto mb-2 h-8 w-8 text-[#15803D]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <p className="text-sm font-medium text-[#15803D]">
                      Audit packet ready for download
                    </p>
                    <p className="mt-1 text-xs text-[#15803D]">
                      {selectedBAAIds.size} contract{selectedBAAIds.size !== 1 ? "s" : ""} included
                    </p>
                  </div>
                </section>
              )}

              {/* Error */}
              {status === "error" && (
                <section>
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-center">
                    <p className="text-sm font-medium text-red-700">
                      Generation failed. Please try again.
                    </p>
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              {status === "complete" ? "Close" : "Cancel"}
            </button>

            <div className="flex gap-2">
              {status === "complete" && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-2 rounded-lg bg-[#15803D] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#166534]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download Packet
                </button>
              )}

              {(status === "idle" || status === "error") && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="flex items-center gap-2 rounded-lg bg-[#0F766E] px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0D6560]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  Generate Packet
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Option Toggle ──────────────────────────────────────────────────────────

function OptionToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-4 py-3 transition-colors hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]/20"
      />
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
    </label>
  );
}
