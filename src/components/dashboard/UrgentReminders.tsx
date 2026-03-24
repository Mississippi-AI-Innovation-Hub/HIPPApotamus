"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UrgentItem {
  baaId: string;
  vendorName: string;
  type: "expired" | "expiring" | "pending";
  /** Days until expiration (negative = overdue). Only for expired/expiring. */
  daysLeft?: number;
}

interface UrgentRemindersProps {
  items: UrgentItem[];
}

// ─── Badge config by type ───────────────────────────────────────────────────

function getBadge(item: UrgentItem): { label: string; bg: string; text: string } {
  switch (item.type) {
    case "expired":
      return { label: "Overdue", bg: "#FEE2E2", text: "#B91C1C" };
    case "expiring":
      return {
        label: `${item.daysLeft} day${item.daysLeft === 1 ? "" : "s"} left`,
        bg: "#FEF3C7",
        text: "#B45309",
      };
    case "pending":
      return { label: "Awaiting signature", bg: "#DBEAFE", text: "#1D4ED8" };
  }
}

function getRowBorder(type: UrgentItem["type"]): string {
  switch (type) {
    case "expired":
      return "#B91C1C";
    case "expiring":
      return "#B45309";
    case "pending":
      return "#1D4ED8";
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function UrgentReminders({ items }: UrgentRemindersProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <svg
            className="h-6 w-6 text-emerald-600"
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
        </div>
        <p className="mt-3 text-sm font-medium text-foreground">All clear!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          No BAAs require immediate attention.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const badge = getBadge(item);
        const borderColor = getRowBorder(item.type);
        const actionLabel = item.type === "pending" ? "View" : "Send Reminder";

        return (
          <Link
            key={item.baaId}
            href={`/dashboard/contracts?baaId=${item.baaId}`}
            className="flex items-center gap-3 rounded-lg border bg-background p-3 transition-colors hover:bg-muted/30 cursor-pointer"
            style={{ borderLeftWidth: "3px", borderLeftColor: borderColor }}
          >
            {/* Vendor info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {item.vendorName}
              </p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {item.baaId}
              </p>
            </div>

            {/* Status badge */}
            <span
              className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: badge.bg, color: badge.text }}
            >
              {badge.label}
            </span>

            {/* Action button */}
            <span
              className="shrink-0 rounded border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              {actionLabel} →
            </span>
          </Link>
        );
      })}
    </div>
  );
}
