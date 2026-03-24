"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { AuditLog } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Types ──────────────────────────────────────────────────────────────────

interface HistoryPageClientProps {
  logs: AuditLog[];
  vendorMap: Record<string, string>;
}

type ActionCategory =
  | "all"
  | "baa_created"
  | "baa_signed"
  | "baa_updated"
  | "baa_deleted"
  | "reminder_sent"
  | "email_sent"
  | "pdf_generated"
  | "vendor_created"
  | "vendor_updated"
  | "vendor_deleted";

// ─── Action config — colored icons by type ──────────────────────────────────

const ACTION_CONFIG: Record<
  string,
  { color: string; bg: string; icon: string; label: string }
> = {
  baa_created: {
    color: "#1D4ED8",
    bg: "#DBEAFE",
    icon: "M12 4.5v15m7.5-7.5h-15",
    label: "BAA Created",
  },
  baa_signed: {
    color: "#15803D",
    bg: "#DCFCE7",
    icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    label: "BAA Signed",
  },
  baa_updated: {
    color: "#7C3AED",
    bg: "#EDE9FE",
    icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125",
    label: "BAA Updated",
  },
  baa_deleted: {
    color: "#DC2626",
    bg: "#FEF2F2",
    icon: "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0",
    label: "BAA Deleted",
  },
  reminder_sent: {
    color: "#CA8A04",
    bg: "#FEFCE8",
    icon: "M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0",
    label: "Reminder Sent",
  },
  email_sent: {
    color: "#0891B2",
    bg: "#CFFAFE",
    icon: "M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75",
    label: "Email Sent",
  },
  pdf_generated: {
    color: "#9333EA",
    bg: "#F3E8FF",
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
    label: "PDF Generated",
  },
  vendor_created: {
    color: "#0D9488",
    bg: "#CCFBF1",
    icon: "M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z",
    label: "Vendor Created",
  },
  vendor_updated: {
    color: "#EA580C",
    bg: "#FFF7ED",
    icon: "M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z",
    label: "Vendor Updated",
  },
  vendor_deleted: {
    color: "#BE123C",
    bg: "#FFE4E6",
    icon: "M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z",
    label: "Vendor Deleted",
  },
  other: {
    color: "#64748B",
    bg: "#F1F5F9",
    icon: "M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z",
    label: "Other",
  },
};

const ACTION_FILTER_OPTIONS: { value: ActionCategory; label: string }[] = [
  { value: "all", label: "All Actions" },
  { value: "baa_created", label: "BAA Created" },
  { value: "baa_signed", label: "BAA Signed" },
  { value: "baa_updated", label: "BAA Updated" },
  { value: "baa_deleted", label: "BAA Deleted" },
  { value: "reminder_sent", label: "Reminder Sent" },
  { value: "email_sent", label: "Email Sent" },
  { value: "pdf_generated", label: "PDF Generated" },
  { value: "vendor_created", label: "Vendor Created" },
  { value: "vendor_updated", label: "Vendor Updated" },
  { value: "vendor_deleted", label: "Vendor Deleted" },
];

const PAGE_SIZE = 25;

// ─── Helpers ────────────────────────────────────────────────────────────────

function classifyAction(action: string): string {
  const lower = action.toLowerCase();
  if (lower.includes("vendor") && lower.includes("deleted")) return "vendor_deleted";
  if (lower.includes("vendor") && (lower.includes("created") || lower.includes("added"))) return "vendor_created";
  if (lower.includes("vendor") && lower.includes("updated")) return "vendor_updated";
  if (lower.includes("baa") && lower.includes("created")) return "baa_created";
  if (lower.includes("signed") || lower.includes("executed")) return "baa_signed";
  if (lower.includes("baa") && lower.includes("updated")) return "baa_updated";
  if (lower.includes("baa") && lower.includes("deleted")) return "baa_deleted";
  if (lower.includes("reminder")) return "reminder_sent";
  if (lower.includes("email") || lower.includes("sent")) return "email_sent";
  if (lower.includes("pdf") || lower.includes("generated")) return "pdf_generated";
  return "other";
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }) +
    " " +
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
}

function formatDetailsValue(value: string | number | boolean | null): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function isToday(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function HistoryPageClient({
  logs,
  vendorMap,
}: HistoryPageClientProps) {
  const router = useRouter();
  const [actionFilter, setActionFilter] = useState<ActionCategory>("all");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Unique vendor IDs from logs
  const vendorOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const log of logs) {
      if (log.vendorId && log.vendorId !== "") {
        ids.add(log.vendorId);
      }
    }
    return Array.from(ids).map((id) => ({
      id,
      name: vendorMap[id] ?? id,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [logs, vendorMap]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    let result = logs;

    // Action type filter
    if (actionFilter !== "all") {
      result = result.filter((log) => classifyAction(log.action) === actionFilter);
    }

    // Vendor filter
    if (vendorFilter !== "all") {
      result = result.filter((log) => log.vendorId === vendorFilter);
    }

    // Date range
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((log) => new Date(log.performedAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((log) => new Date(log.performedAt) <= to);
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (log) =>
          log.action.toLowerCase().includes(q) ||
          log.performedBy.toLowerCase().includes(q) ||
          (vendorMap[log.vendorId] ?? "").toLowerCase().includes(q) ||
          JSON.stringify(log.details).toLowerCase().includes(q),
      );
    }

    return result;
  }, [logs, actionFilter, vendorFilter, dateFrom, dateTo, searchQuery, vendorMap]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // Stats
  const eventsToday = filteredLogs.filter((log) => isToday(log.performedAt)).length;
  const mostRecentTimestamp =
    filteredLogs.length > 0 ? formatTimestamp(filteredLogs[0]!.performedAt) : "N/A";

  // Reset page when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setActionFilter("all");
    setVendorFilter("all");
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    actionFilter !== "all" ||
    vendorFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    searchQuery.trim() !== "";

  return (
    <div className="space-y-6">
      {/* ── Filters Bar ──────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            {/* Action Type */}
            <div className="min-w-[180px]">
              <label
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
                htmlFor="action-filter"
              >
                Action Type
              </label>
              <select
                id="action-filter"
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value as ActionCategory);
                  handleFilterChange();
                }}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {ACTION_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Vendor */}
            <div className="min-w-[180px]">
              <label
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
                htmlFor="vendor-filter"
              >
                Vendor
              </label>
              <select
                id="vendor-filter"
                value={vendorFilter}
                onChange={(e) => {
                  setVendorFilter(e.target.value);
                  handleFilterChange();
                }}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="all">All Vendors</option>
                {vendorOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div className="min-w-[150px]">
              <label
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
                htmlFor="date-from"
              >
                From
              </label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  handleFilterChange();
                }}
              />
            </div>

            {/* Date To */}
            <div className="min-w-[150px]">
              <label
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
                htmlFor="date-to"
              >
                To
              </label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  handleFilterChange();
                }}
              />
            </div>

            {/* Search */}
            <div className="min-w-[200px] flex-1">
              <label
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
                htmlFor="search-query"
              >
                Search
              </label>
              <Input
                id="search-query"
                type="text"
                placeholder="Search actions, users, details..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleFilterChange();
                }}
              />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <svg
                  className="mr-1.5 h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Stats Bar ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: "#DBEAFE" }}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                style={{ color: "#1D4ED8" }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5"
                />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{filteredLogs.length}</p>
              <p className="text-xs text-muted-foreground">Total Events</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: "#DCFCE7" }}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                style={{ color: "#15803D" }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{eventsToday}</p>
              <p className="text-xs text-muted-foreground">Events Today</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: "#FEF3C7" }}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                style={{ color: "#CA8A04" }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground font-mono">
                {mostRecentTimestamp}
              </p>
              <p className="text-xs text-muted-foreground">Most Recent Event</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* ── Results Table ─────────────────────────────────────────────── */}
      {paginatedLogs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <svg
              className="mb-4 h-12 w-12 text-muted-foreground/40"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            <p className="text-sm font-medium text-muted-foreground">
              No activity matches the current filters
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="pr-4">IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map((log) => {
                  const actionType = classifyAction(log.action);
                  const config = ACTION_CONFIG[actionType] ?? ACTION_CONFIG["other"]!;
                  const vendorName = log.vendorId ? (vendorMap[log.vendorId] ?? log.vendorId) : "--";
                  const isExpanded = expandedRow === log.id;
                  const hasDetails =
                    log.details && Object.keys(log.details).length > 0;
                  const isClickable = log.baaId && log.baaId !== "system";

                  return (
                    <TableRow
                      key={log.id}
                      className={isClickable ? "cursor-pointer" : ""}
                      onClick={() => {
                        if (isClickable) {
                          router.push(
                            `/dashboard/contracts?baaId=${log.baaId}`,
                          );
                        }
                      }}
                    >
                      <TableCell className="pl-4">
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatTimestamp(log.performedAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: config.bg }}
                          >
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              style={{ color: config.color }}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d={config.icon}
                              />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {log.action}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-foreground">{vendorName}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {log.performedBy}
                        </span>
                      </TableCell>
                      <TableCell>
                        {hasDetails ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedRow(isExpanded ? null : log.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <svg
                              className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m8.25 4.5 7.5 7.5-7.5 7.5"
                              />
                            </svg>
                            {isExpanded ? "Hide" : "View"}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">--</span>
                        )}
                        {isExpanded && hasDetails && (
                          <div
                            className="mt-2 rounded-md border bg-muted/30 p-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <dl className="space-y-1">
                              {Object.entries(log.details).map(([key, value]) => (
                                <div key={key} className="flex gap-2 text-xs">
                                  <dt className="shrink-0 font-medium text-muted-foreground">
                                    {key}:
                                  </dt>
                                  <dd className="break-all font-mono text-foreground">
                                    {formatDetailsValue(value)}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="pr-4">
                        <span className="font-mono text-xs text-muted-foreground">
                          {log.ipAddress ?? "--"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── Pagination ────────────────────────────────────────────────── */}
      {filteredLogs.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}&ndash;
            {Math.min(currentPage * PAGE_SIZE, filteredLogs.length)} of{" "}
            {filteredLogs.length} events
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <svg
                className="mr-1 h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5 8.25 12l7.5-7.5"
                />
              </svg>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
              <svg
                className="ml-1 h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m8.25 4.5 7.5 7.5-7.5 7.5"
                />
              </svg>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
