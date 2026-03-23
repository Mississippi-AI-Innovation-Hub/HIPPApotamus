"use client";

import { useMemo, useState } from "react";
import type { BAA, Vendor } from "@/types";
import { useToast } from "@/components/ui/Toast";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ReminderSchedulerProps {
  baas: BAA[];
  vendors: Vendor[];
}

interface ReminderEvent {
  baa: BAA;
  vendor: Vendor;
  daysRemaining: number;
  thresholds: number[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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

const THRESHOLD_COLORS: Record<number, string> = {
  90: "bg-blue-100 text-blue-700 border-blue-200",
  60: "bg-cyan-100 text-cyan-700 border-cyan-200",
  30: "bg-amber-100 text-amber-700 border-amber-200",
  7: "bg-red-100 text-red-700 border-red-200",
};

function getActiveThresholds(days: number): number[] {
  const thresholds = [90, 60, 30, 7];
  return thresholds.filter((t) => days <= t);
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ReminderScheduler({ baas, vendors }: ReminderSchedulerProps) {
  const { addToast } = useToast();
  const [sendingAll, setSendingAll] = useState(false);
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());

  const reminderEvents = useMemo(() => {
    const events: ReminderEvent[] = [];

    for (const baa of baas) {
      if (baa.status !== "expiring_soon" && baa.status !== "expired") continue;

      const vendor = vendors.find((v) => v.id === baa.vendorId);
      if (!vendor) continue;

      const days = daysUntilExpiration(baa.expirationDate);
      const thresholds = getActiveThresholds(days);

      if (thresholds.length > 0 || days < 0) {
        events.push({ baa, vendor, daysRemaining: days, thresholds });
      }
    }

    // Sort: most urgent first
    return events.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [baas, vendors]);

  const handleSendNow = async (event: ReminderEvent) => {
    const id = event.baa.id;
    setSendingIds((prev) => new Set(prev).add(id));
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      addToast(`Reminder sent to ${event.vendor.contactEmail}`, "success");
    } catch {
      addToast(`Failed to send reminder to ${event.vendor.name}`, "error");
    } finally {
      setSendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleScheduleAll = async () => {
    setSendingAll(true);
    try {
      // Simulate batch API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      addToast(
        `${reminderEvents.length} reminders scheduled successfully`,
        "success"
      );
    } catch {
      addToast("Failed to schedule reminders", "error");
    } finally {
      setSendingAll(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Upcoming Reminders</h3>
          <p className="text-xs text-slate-400">
            {reminderEvents.length} vendor{reminderEvents.length !== 1 ? "s" : ""} requiring attention
          </p>
        </div>
        {reminderEvents.length > 0 && (
          <button
            type="button"
            onClick={handleScheduleAll}
            disabled={sendingAll}
            className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sendingAll && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {sendingAll ? "Scheduling..." : "Schedule All"}
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {[90, 60, 30, 7].map((d) => (
          <span
            key={d}
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${THRESHOLD_COLORS[d]}`}
          >
            {d}-day
          </span>
        ))}
        <span className="inline-flex items-center rounded-full border border-red-300 bg-red-50 px-2.5 py-0.5 text-[10px] font-semibold text-red-700">
          Overdue
        </span>
      </div>

      {/* Event List */}
      {reminderEvents.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <svg className="mx-auto mb-3 h-10 w-10 text-emerald-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-sm font-medium text-slate-500">All caught up!</p>
          <p className="mt-1 text-xs text-slate-400">
            No contracts require immediate reminders.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {reminderEvents.map((event) => {
            const isSending = sendingIds.has(event.baa.id);
            const isOverdue = event.daysRemaining < 0;

            return (
              <div
                key={event.baa.id}
                className={`flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm transition-colors ${
                  isOverdue ? "border-red-200" : "border-slate-200"
                }`}
              >
                {/* Urgency indicator */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isOverdue
                      ? "bg-red-100 text-red-600"
                      : event.daysRemaining <= 7
                        ? "bg-red-100 text-red-600"
                        : event.daysRemaining <= 30
                          ? "bg-amber-100 text-amber-600"
                          : "bg-blue-100 text-blue-600"
                  }`}
                >
                  {isOverdue ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                  ) : (
                    `${event.daysRemaining}d`
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">
                    {event.vendor.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {isOverdue
                      ? `Expired ${Math.abs(event.daysRemaining)} days ago`
                      : `Expires ${formatDate(event.baa.expirationDate)}`}
                    {" "}
                    &middot; {event.vendor.contactEmail}
                  </p>
                </div>

                {/* Threshold badges */}
                <div className="hidden flex-wrap gap-1 sm:flex">
                  {isOverdue ? (
                    <span className="inline-flex items-center rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                      Overdue
                    </span>
                  ) : (
                    event.thresholds.map((t) => (
                      <span
                        key={t}
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${THRESHOLD_COLORS[t]}`}
                      >
                        {t}d
                      </span>
                    ))
                  )}
                </div>

                {/* Action */}
                <button
                  type="button"
                  onClick={() => handleSendNow(event)}
                  disabled={isSending}
                  className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSending ? (
                    <svg className="mx-auto h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    "Send Now"
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
