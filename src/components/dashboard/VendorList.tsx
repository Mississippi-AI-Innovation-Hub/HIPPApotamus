"use client";

import { useMemo, useState } from "react";
import type { BAA, BAAStatus, Vendor, VendorType } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

const STATUS_DOT: Record<BAAStatus, string> = {
  active: "bg-success",
  expiring_soon: "bg-warning",
  expired: "bg-destructive",
  pending_signature: "bg-muted-foreground",
};

const STATUS_BAR_COLORS: Record<BAAStatus, string> = {
  active: "#15803D",
  expiring_soon: "#CA8A04",
  expired: "#DC2626",
  pending_signature: "#64748B",
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
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
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
          <Input
            type="text"
            placeholder="Search vendors by name, contact, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Grid */}
      {filteredVendors.length === 0 ? (
        <Card className="px-6 py-12 text-center">
          <CardContent className="p-0">
            <svg className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            <p className="text-sm text-muted-foreground">No vendors match your search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredVendors.map((vendor) => {
            const baa = vendorBAAs.get(vendor.id);
            const barColor = baa ? STATUS_BAR_COLORS[baa.status] : "#E2E8F0";
            return (
              <Card
                key={vendor.id}
                className="group card-hover shadow-premium cursor-pointer overflow-hidden rounded-xl transition-all hover:border-primary/30"
                onClick={() => onSelectVendor(vendor)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectVendor(vendor);
                  }
                }}
              >
                {/* Status indicator bar at the top */}
                <div
                  className="h-1 w-full"
                  style={{ backgroundColor: barColor }}
                />

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle
                      className="text-base font-bold group-hover:text-primary"
                      style={{ fontFamily: "'Satoshi', sans-serif" }}
                    >
                      {vendor.name}
                    </CardTitle>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {formatVendorType(vendor.type)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="relative pb-0">
                  {/* Contact */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <svg className="h-3.5 w-3.5 shrink-0 text-primary/60" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                      </svg>
                      <span className="truncate">{vendor.contactName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <svg className="h-3.5 w-3.5 shrink-0 text-primary/60" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                      </svg>
                      <span className="truncate">{vendor.contactEmail}</span>
                    </div>
                  </div>

                  {/* Footer -- BAA status + activity */}
                  <div className="relative mt-4 flex items-center justify-between border-t border-border pt-4 pb-4">
                    {/* Subtle gradient bg at bottom */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-muted/20 to-transparent" />
                    {baa ? (
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[baa.status]}`} />
                        <span className="text-xs font-medium text-muted-foreground">
                          {STATUS_TEXT[baa.status]}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No BAA</span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {formatRelativeTime(vendor.updatedAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
