"use client";

import { useMemo, useState } from "react";
import type { BAA, BAAStatus, Vendor } from "@/types";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

function StatusBadge({ status }: { status: BAAStatus }) {
  return (
    <Badge variant={STATUS_BADGE_VARIANT[status]}>
      {STATUS_LABELS[status]}
    </Badge>
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
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter pills */}
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Search */}
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
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 sm:w-64"
          />
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Vendor
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Type
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Effective
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Expires
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Days Left
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredBAAs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                No contracts match the current filters.
              </TableCell>
            </TableRow>
          ) : (
            filteredBAAs.map((baa) => {
              const days = daysUntilExpiration(baa.expirationDate);
              return (
                <TableRow
                  key={baa.id}
                  onClick={() => onSelectBAA(baa)}
                  className="cursor-pointer hover:bg-muted/50"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectBAA(baa);
                    }
                  }}
                >
                  <TableCell>
                    <div className="text-sm font-semibold text-foreground">
                      {getVendorName(vendors, baa.vendorId)}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {baa.id}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {getVendorType(vendors, baa.vendorId)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={baa.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(baa.effectiveDate)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(baa.expirationDate)}
                  </TableCell>
                  <TableCell>
                    <DaysIndicator days={days} status={baa.status} />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Footer */}
      <div className="border-t border-border bg-muted/50 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Showing {filteredBAAs.length} of {baas.length} contracts
        </p>
      </div>
    </div>
  );
}

// ─── Days Indicator ─────────────────────────────────────────────────────────

function DaysIndicator({ days, status }: { days: number; status: BAAStatus }) {
  if (status === "pending_signature") {
    return <span className="text-sm text-muted-foreground">--</span>;
  }

  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-destructive">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        {Math.abs(days)}d overdue
      </span>
    );
  }

  if (days <= 30) {
    return <span className="text-sm font-semibold text-destructive">{days}d</span>;
  }

  if (days <= 90) {
    return <span className="text-sm font-semibold text-warning">{days}d</span>;
  }

  return <span className="text-sm text-muted-foreground">{days}d</span>;
}
