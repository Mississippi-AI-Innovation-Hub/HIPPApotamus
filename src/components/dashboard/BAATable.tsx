"use client";

import { useMemo, useState } from "react";
import type { BAA, BAAStatus, Vendor } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface BAATableProps {
  baas: BAA[];
  vendors: Vendor[];
  onSelectBAA: (baa: BAA) => void;
}

type FilterKey = "all" | BAAStatus;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getVendorName(vendors: Vendor[], vendorId: string): string {
  const vendor = vendors.find((v) => v.id === vendorId);
  return vendor ? vendor.name : "Unknown Vendor";
}

function getVendorType(vendors: Vendor[], vendorId: string): string {
  const vendor = vendors.find((v) => v.id === vendorId);
  if (!vendor) return "";
  return vendor.type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function daysUntilExpiration(expirationDate: string): number {
  const now = new Date();
  const exp = new Date(expirationDate);
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ─── Status Badge ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<BAAStatus, string> = {
  active: "bg-[#DCFCE7] text-[#15803D]",
  expiring_soon: "bg-[#FEF3C7] text-[#B45309]",
  expired: "bg-[#FEE2E2] text-[#B91C1C]",
  pending_signature: "bg-[#DBEAFE] text-[#1D4ED8]",
};

const STATUS_LABELS: Record<BAAStatus, string> = {
  active: "Active",
  expiring_soon: "Expiring Soon",
  expired: "Expired",
  pending_signature: "Pending Signature",
};

function StatusBadge({ status }: { status: BAAStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// ─── Filter Tabs ────────────────────────────────────────────────────────────

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "expiring_soon", label: "Expiring Soon" },
  { key: "expired", label: "Expired" },
  { key: "pending_signature", label: "Pending Signature" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function BAATable({ baas, vendors, onSelectBAA }: BAATableProps) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  const filteredBAAs = useMemo(() => {
    let result = baas;

    // Status filter
    if (filter !== "all") {
      result = result.filter((b) => b.status === filter);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((b) => {
        const vendorName = getVendorName(vendors, b.vendorId).toLowerCase();
        return vendorName.includes(q);
      });
    }

    return result;
  }, [baas, vendors, filter, search]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter pills */}
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                filter === f.key
                  ? "bg-[#0F766E] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/10 sm:w-64"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Vendor
              </th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Type
              </th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Status
              </th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Effective
              </th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Expires
              </th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Days Left
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredBAAs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                  No contracts match the current filters.
                </td>
              </tr>
            ) : (
              filteredBAAs.map((baa) => {
                const days = daysUntilExpiration(baa.expirationDate);
                return (
                  <tr
                    key={baa.id}
                    onClick={() => onSelectBAA(baa)}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectBAA(baa);
                      }
                    }}
                  >
                    <td className="px-4 py-3.5">
                      <div className="text-sm font-medium text-slate-900">
                        {getVendorName(vendors, baa.vendorId)}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400">
                        {baa.id}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">
                      {getVendorType(vendors, baa.vendorId)}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={baa.status} />
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">
                      {formatDate(baa.effectiveDate)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">
                      {formatDate(baa.expirationDate)}
                    </td>
                    <td className="px-4 py-3.5">
                      <DaysIndicator days={days} status={baa.status} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs text-slate-400">
          Showing {filteredBAAs.length} of {baas.length} contracts
        </p>
      </div>
    </div>
  );
}

// ─── Days Indicator ─────────────────────────────────────────────────────────

function DaysIndicator({ days, status }: { days: number; status: BAAStatus }) {
  if (status === "pending_signature") {
    return <span className="text-sm text-slate-400">--</span>;
  }

  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#B91C1C]">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        {Math.abs(days)}d overdue
      </span>
    );
  }

  if (days <= 30) {
    return <span className="text-sm font-semibold text-[#B91C1C]">{days}d</span>;
  }

  if (days <= 90) {
    return <span className="text-sm font-semibold text-[#B45309]">{days}d</span>;
  }

  return <span className="text-sm text-slate-600">{days}d</span>;
}
