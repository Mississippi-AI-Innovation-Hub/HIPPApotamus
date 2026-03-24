"use client";

import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ActivityEntry {
  id: string;
  baaId: string;
  action: string;
  performedBy: string;
  performedAt: string; // ISO 8601
  actionType: "BAA_CREATED" | "BAA_SIGNED" | "REMINDER_SENT" | "BAA_EXPIRED" | "SIGNING_LINK_OPENED" | "OTHER";
}

interface RecentActivityProps {
  entries: ActivityEntry[];
}

// ─── Action type config ─────────────────────────────────────────────────────

const ACTION_CONFIG: Record<
  ActivityEntry["actionType"],
  { color: string; bg: string; icon: string }
> = {
  BAA_CREATED: {
    color: "#1D4ED8",
    bg: "#DBEAFE",
    icon: "M12 4.5v15m7.5-7.5h-15",
  },
  BAA_SIGNED: {
    color: "#15803D",
    bg: "#DCFCE7",
    icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  },
  REMINDER_SENT: {
    color: "#CA8A04",
    bg: "#FEFCE8",
    icon: "M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0",
  },
  BAA_EXPIRED: {
    color: "#DC2626",
    bg: "#FEF2F2",
    icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z",
  },
  SIGNING_LINK_OPENED: {
    color: "#64748B",
    bg: "#F1F5F9",
    icon: "M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25",
  },
  OTHER: {
    color: "#64748B",
    bg: "#F1F5F9",
    icon: "M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z",
  },
};

// ─── Relative time formatter ────────────────────────────────────────────────

function relativeTime(isoDate: string): string {
  const now = new Date();
  const date = new Date(isoDate);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? "" : "s"} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth} month${diffMonth === 1 ? "" : "s"} ago`;
}

// ─── Classify action string into a known type ──────────────────────────────

function classifyAction(action: string): ActivityEntry["actionType"] {
  const lower = action.toLowerCase();
  if (lower.includes("created") || lower.includes("new baa")) return "BAA_CREATED";
  if (lower.includes("signed") || lower.includes("executed")) return "BAA_SIGNED";
  if (lower.includes("reminder") || lower.includes("notif")) return "REMINDER_SENT";
  if (lower.includes("expired") || lower.includes("expiration")) return "BAA_EXPIRED";
  if (lower.includes("link") || lower.includes("opened")) return "SIGNING_LINK_OPENED";
  return "OTHER";
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function RecentActivity({ entries }: RecentActivityProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">No recent activity.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry, idx) => {
        const type = entry.actionType !== "OTHER" ? entry.actionType : classifyAction(entry.action);
        const config = ACTION_CONFIG[type];
        const isLast = idx === entries.length - 1;

        return (
          <Link key={entry.id} href={`/dashboard/contracts?baaId=${entry.baaId}`} className="flex gap-3 rounded-lg -mx-2 px-2 py-1 transition-colors hover:bg-muted/40 cursor-pointer">
            {/* Timeline column: icon + connector line */}
            <div className="flex flex-col items-center">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: config.bg }}
              >
                <svg
                  className="h-4 w-4"
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
              {!isLast && (
                <div className="w-px flex-1 bg-border/60 my-1" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4 min-w-0">
              <p className="text-sm text-foreground leading-snug">
                {entry.action}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {entry.performedBy}
                </span>
                <span className="text-xs text-muted-foreground/50">·</span>
                <span className="text-xs text-muted-foreground">
                  {relativeTime(entry.performedAt)}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
