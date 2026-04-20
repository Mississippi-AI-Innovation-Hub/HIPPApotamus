"use client";

import { useMemo, useState } from "react";
import type { BAA, Vendor } from "@/types";
import { useToast } from "@/components/ui/Toast";
import {
  computeReminderEvents,
  type ReminderEvent,
  type ReminderKind,
} from "@/lib/reminders/policy";

interface ReminderSchedulerProps {
  baas: BAA[];
  vendors: Vendor[];
}

const CLINIC_NAME = "Central Mississippi Health District";
const ADMIN_EMAIL = "bipuladk60+clinic@gmail.com";
const HIPAA_OFFICER_NAME = "James Tran";

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

const KIND_LABEL: Record<ReminderKind, string> = {
  expiration: "Expiring",
  pending_signature: "Awaiting Vendor Signature",
  pending_countersignature: "Awaiting Counter-Sign",
};

const KIND_COLOR: Record<ReminderKind, string> = {
  expiration: "bg-amber-100 text-amber-700 border-amber-200",
  pending_signature: "bg-blue-100 text-blue-700 border-blue-200",
  pending_countersignature: "bg-orange-100 text-orange-700 border-orange-300",
};

interface SendPayload {
  type: string;
  to: string;
  params: Record<string, string | number>;
}

function buildPayload(
  event: ReminderEvent,
  vendor: Vendor,
  origin: string,
): { primary: SendPayload; recipientLabel: string } {
  const baseParams = {
    vendorName: vendor.name,
    vendorId: vendor.id,
    contactName: vendor.contactName,
    clinicName: CLINIC_NAME,
    baaId: event.baa.id,
  };

  if (event.kind === "expiration") {
    return {
      recipientLabel: vendor.contactEmail,
      primary: {
        type: "reminder",
        to: vendor.contactEmail,
        params: {
          ...baseParams,
          daysUntilExpiration: event.daysRelevant,
          renewalUrl: `${origin}/sign/${event.baa.id}`,
        },
      },
    };
  }

  if (event.kind === "pending_signature") {
    return {
      recipientLabel: vendor.contactEmail,
      primary: {
        type: "pending_signature_reminder",
        to: vendor.contactEmail,
        params: {
          ...baseParams,
          daysSinceInvitation: event.daysRelevant,
          signingUrl: `${origin}/sign/${event.baa.id}`,
        },
      },
    };
  }

  // pending_countersignature → ping the clinic admin/HIPAA officer
  return {
    recipientLabel: ADMIN_EMAIL,
    primary: {
      type: "pending_countersign_reminder",
      to: ADMIN_EMAIL,
      params: {
        ...baseParams,
        hipaaOfficerName: HIPAA_OFFICER_NAME,
        daysSinceVendorSigned: event.daysRelevant,
        vendorSignerName: event.baa.signedBy ?? vendor.contactName,
        dashboardUrl: `${origin}/dashboard`,
      },
    },
  };
}

export default function ReminderScheduler({ baas, vendors }: ReminderSchedulerProps) {
  const { addToast } = useToast();
  const [sendingAll, setSendingAll] = useState(false);
  const [sendAllProgress, setSendAllProgress] = useState({ current: 0, total: 0 });
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());

  const events = useMemo(() => {
    const all = computeReminderEvents(baas);
    return all
      .map((evt) => {
        const vendor = vendors.find((v) => v.id === evt.baa.vendorId);
        return vendor ? { evt, vendor } : null;
      })
      .filter((x): x is { evt: ReminderEvent; vendor: Vendor } => x !== null);
  }, [baas, vendors]);

  const handleSendOne = async ({ evt, vendor }: { evt: ReminderEvent; vendor: Vendor }) => {
    const id = `${evt.baa.id}-${evt.kind}`;
    setSendingIds((prev) => new Set(prev).add(id));
    try {
      const { primary, recipientLabel } = buildPayload(evt, vendor, window.location.origin);

      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(primary),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error ?? "Failed to send reminder");
      }

      addToast(`Reminder sent to ${recipientLabel}`, "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send reminder";
      addToast(`Failed to send reminder for ${vendor.name}: ${message}`, "error");
    } finally {
      setSendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleScheduleAll = async () => {
    const total = events.length;
    if (total === 0) return;

    setSendingAll(true);
    setSendAllProgress({ current: 0, total });

    let success = 0;
    let fail = 0;

    for (let i = 0; i < total; i++) {
      const item = events[i];
      setSendAllProgress({ current: i + 1, total });

      try {
        const { primary } = buildPayload(item.evt, item.vendor, window.location.origin);
        const res = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(primary),
        });
        if (res.ok) success++;
        else fail++;
      } catch {
        fail++;
      }
    }

    if (fail === 0) {
      addToast(`All ${success} reminders sent successfully`, "success");
    } else {
      addToast(
        `${success} sent, ${fail} failed. Retry failed reminders individually.`,
        fail === total ? "error" : "info",
      );
    }

    setSendingAll(false);
    setSendAllProgress({ current: 0, total: 0 });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Upcoming Reminders</h3>
          <p className="text-xs text-slate-400">
            {events.length} item{events.length !== 1 ? "s" : ""} requiring attention across expiration, pending signature, and counter-signature
          </p>
        </div>
        {events.length > 0 && (
          <button
            type="button"
            onClick={handleScheduleAll}
            disabled={sendingAll}
            className="flex items-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0D6560] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sendingAll && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {sendingAll
              ? `Sending ${sendAllProgress.current} of ${sendAllProgress.total}...`
              : "Schedule All"}
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {(["expiration", "pending_signature", "pending_countersignature"] as ReminderKind[]).map((k) => (
          <span
            key={k}
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${KIND_COLOR[k]}`}
          >
            {KIND_LABEL[k]}
          </span>
        ))}
        <span className="inline-flex items-center rounded-full border border-red-300 bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
          Overdue
        </span>
      </div>

      {/* Event list */}
      {events.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
          <svg className="mx-auto mb-3 h-10 w-10 text-[#15803D]/40" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-sm font-medium text-slate-500">All caught up!</p>
          <p className="mt-1 text-xs text-slate-400">
            No contracts require reminders right now.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map(({ evt, vendor }) => {
            const sendingId = `${evt.baa.id}-${evt.kind}`;
            const isSending = sendingIds.has(sendingId);

            return (
              <div
                key={sendingId}
                className={`flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm transition-colors ${
                  evt.isOverdue ? "border-red-200" : "border-slate-200"
                }`}
              >
                {/* Urgency indicator */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    evt.isOverdue
                      ? "bg-red-100 text-red-600"
                      : evt.kind === "pending_countersignature"
                        ? "bg-orange-100 text-orange-700"
                        : evt.kind === "pending_signature"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-600"
                  }`}
                >
                  {evt.isOverdue ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                  ) : (
                    `${Math.abs(evt.daysRelevant)}d`
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">
                    {vendor.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {evt.kind === "expiration" &&
                      (evt.isOverdue
                        ? `Expired ${Math.abs(evt.daysRelevant)} days ago`
                        : `Expires ${formatDate(evt.baa.expirationDate)}`)}
                    {evt.kind === "pending_signature" &&
                      `Invitation sent ${evt.daysRelevant} day${evt.daysRelevant === 1 ? "" : "s"} ago — vendor has not signed`}
                    {evt.kind === "pending_countersignature" &&
                      `Vendor signed ${evt.daysRelevant} day${evt.daysRelevant === 1 ? "" : "s"} ago — counter-sign required`}
                  </p>
                </div>

                {/* Kind badge */}
                <div className="hidden sm:block">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${KIND_COLOR[evt.kind]}`}
                  >
                    {KIND_LABEL[evt.kind]} · {evt.thresholdHit}d
                  </span>
                </div>

                {/* Action */}
                <button
                  type="button"
                  onClick={() => handleSendOne({ evt, vendor })}
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
