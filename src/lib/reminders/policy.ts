import type { BAA } from "@/types";

export type ReminderKind =
  | "expiration"
  | "pending_signature"
  | "pending_countersignature";

export interface ReminderEvent {
  baa: BAA;
  kind: ReminderKind;
  daysRelevant: number;
  thresholdHit: number;
  isOverdue: boolean;
}

export const EXPIRATION_THRESHOLDS = [90, 60, 30, 7] as const;
export const PENDING_SIGNATURE_THRESHOLDS = [3, 7, 14] as const;
export const PENDING_COUNTERSIGN_THRESHOLDS = [1, 3, 7] as const;

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

/**
 * Builds the canonical idempotency key for a reminder event so the same
 * threshold isn't sent twice in a single cron window.
 */
export function reminderKey(event: ReminderEvent): string {
  return `${event.kind}:${event.thresholdHit}`;
}

export function computeReminderEvents(baas: BAA[]): ReminderEvent[] {
  const events: ReminderEvent[] = [];

  for (const baa of baas) {
    if (baa.status === "expiring_soon" || baa.status === "expired") {
      const days = daysUntil(baa.expirationDate);
      const crossed = EXPIRATION_THRESHOLDS.filter((t) => days <= t);
      if (crossed.length > 0 || days < 0) {
        events.push({
          baa,
          kind: "expiration",
          daysRelevant: days,
          thresholdHit: crossed[crossed.length - 1] ?? 0,
          isOverdue: days < 0,
        });
      }
    }

    if (baa.status === "pending_signature") {
      const days = daysSince(baa.createdAt);
      const crossed = PENDING_SIGNATURE_THRESHOLDS.filter((t) => days >= t);
      if (crossed.length > 0) {
        events.push({
          baa,
          kind: "pending_signature",
          daysRelevant: days,
          thresholdHit: crossed[crossed.length - 1],
          isOverdue:
            days >=
            PENDING_SIGNATURE_THRESHOLDS[
              PENDING_SIGNATURE_THRESHOLDS.length - 1
            ],
        });
      }
    }

    if (baa.status === "pending_countersignature" && baa.signedDate) {
      const days = daysSince(baa.signedDate);
      const crossed = PENDING_COUNTERSIGN_THRESHOLDS.filter((t) => days >= t);
      if (crossed.length > 0) {
        events.push({
          baa,
          kind: "pending_countersignature",
          daysRelevant: days,
          thresholdHit: crossed[crossed.length - 1],
          isOverdue:
            days >=
            PENDING_COUNTERSIGN_THRESHOLDS[
              PENDING_COUNTERSIGN_THRESHOLDS.length - 1
            ],
        });
      }
    }
  }

  return events.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    return a.kind === "expiration"
      ? a.daysRelevant - b.daysRelevant
      : b.daysRelevant - a.daysRelevant;
  });
}
