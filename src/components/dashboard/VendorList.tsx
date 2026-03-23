"use client";

import { useMemo, useState } from "react";
import type { BAA, BAAStatus, Vendor, VendorType } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface VendorListProps {
  vendors: Vendor[];
  baas: BAA[];
  onSelectVendor: (vendor: Vendor) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatVendorType(type: VendorType): string {
  const LABELS: Record<VendorType, string> = {
    ehr_platform: "EHR Platform",
    reference_laboratory: "Reference Lab",
    telehealth_platform: "Telehealth",
    eprescribing_pmp: "e-Prescribing / PMP",
    medical_records_storage: "Records Storage",
    other: "Other",
  };
  return LABELS[type];
}

const TYPE_COLORS: Record<VendorType, string> = {
  ehr_platform: "bg-blue-100 text-blue-700",
  reference_laboratory: "bg-violet-100 text-violet-700",
  telehealth_platform: "bg-cyan-100 text-cyan-700",
  eprescribing_pmp: "bg-pink-100 text-pink-700",
  medical_records_storage: "bg-orange-100 text-orange-700",
  other: "bg-slate-100 text-slate-600",
};

const STATUS_DOT: Record<BAAStatus, string> = {
  active: "bg-emerald-500",
  expiring_soon: "bg-amber-500",
  expired: "bg-red-500",
  pending_signature: "bg-slate-400",
};

const STATUS_TEXT: Record<BAAStatus, string> = {
  active: "Active",
  expiring_soon: "Expiring Soon",
  expired: "Expired",
  pending_signature: "Pending Signature",
};

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  } catch {
    return dateStr;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function VendorList({ vendors, baas, onSelectVendor }: VendorListProps) {
  const [search, setSearch] = useState("");

  const vendorBAAs = useMemo(() => {
    const map = new Map<string, BAA | undefined>();
    for (const vendor of vendors) {
      const vendorBaas = baas.filter((b) => b.vendorId === vendor.id);
      // Pick the most "relevant" BAA: active > expiring > pending > expired
      const priority: BAAStatus[] = ["active", "expiring_soon", "pending_signature", "expired"];
      const sorted = vendorBaas.sort(
        (a, b) => priority.indexOf(a.status) - priority.indexOf(b.status)
      );
      map.set(vendor.id, sorted[0]);
    }
    return map;
  }, [vendors, baas]);

  const filteredVendors = useMemo(() => {
    if (!search.trim()) return vendors;
    const q = search.toLowerCase();
    return vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.contactName.toLowerCase().includes(q) ||
        v.contactEmail.toLowerCase().includes(q)
    );
  }, [vendors, search]);

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
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
            placeholder="Search vendors by name, contact, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
          />
        </div>
      </div>

      {/* Grid */}
      {filteredVendors.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <svg className="mx-auto mb-3 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
          <p className="text-sm text-slate-400">No vendors match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredVendors.map((vendor) => {
            const baa = vendorBAAs.get(vendor.id);
            return (
              <button
                key={vendor.id}
                type="button"
                onClick={() => onSelectVendor(vendor)}
                className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-teal-200 hover:shadow-md"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-bold text-slate-800 group-hover:text-teal-700">
                    {vendor.name}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${TYPE_COLORS[vendor.type]}`}
                  >
                    {formatVendorType(vendor.type)}
                  </span>
                </div>

                {/* Contact */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                    <span className="truncate">{vendor.contactName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                    <span className="truncate">{vendor.contactEmail}</span>
                  </div>
                </div>

                {/* Footer — BAA status + activity */}
                <div className="mt-auto flex items-center justify-between pt-4">
                  {baa ? (
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${STATUS_DOT[baa.status]}`} />
                      <span className="text-xs font-medium text-slate-500">
                        {STATUS_TEXT[baa.status]}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-300">No BAA</span>
                  )}
                  <span className="text-[10px] text-slate-300">
                    {formatRelativeTime(vendor.updatedAt)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
