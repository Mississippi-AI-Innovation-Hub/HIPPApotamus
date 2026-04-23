import {
  getVendorById,
  getClinic,
  updateBAA,
  addAuditLog,
} from "@/lib/db";
import {
  reminderEmail,
  pendingSignatureReminderEmail,
  pendingCounterSignReminderEmail,
} from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/sender";
import { logger } from "@/lib/logger";
import { reminderKey, type ReminderEvent } from "./policy";

const ADMIN_EMAIL_FALLBACK =
  process.env.ADMIN_EMAIL ?? "bipuladk60+clinic@gmail.com";

export type SendStatus =
  | "sent"
  | "skipped_recent"
  | "missing_vendor"
  | "missing_email"
  | "failed";

export interface SendOutcome {
  baaId: string;
  kind: ReminderEvent["kind"];
  threshold: number;
  status: SendStatus;
  detail?: string;
}

interface SendOptions {
  performedBy: string;
  /** When true, skip the once-per-24h dedupe check (manual override). */
  force?: boolean;
  baseUrl?: string;
}

const ONE_DAY_MS = 23 * 60 * 60 * 1000;

/**
 * Sends a single reminder email for a computed event and writes the
 * timestamp into BAA.reminderHistory so the cron de-dupes future runs.
 * Used by the cron loop AND by the manual "Send Now" UI action so they
 * never diverge.
 */
export async function sendReminderForEvent(
  event: ReminderEvent,
  opts: SendOptions,
): Promise<SendOutcome> {
  const baseUrl =
    opts.baseUrl ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  const key = reminderKey(event);
  const now = Date.now();

  const lastSent = event.baa.reminderHistory?.[key];
  if (!opts.force && lastSent && now - new Date(lastSent).getTime() < ONE_DAY_MS) {
    return {
      baaId: event.baa.id,
      kind: event.kind,
      threshold: event.thresholdHit,
      status: "skipped_recent",
      detail: `last sent ${lastSent}`,
    };
  }

  const vendor = await getVendorById(event.baa.vendorId);
  if (!vendor) {
    return {
      baaId: event.baa.id,
      kind: event.kind,
      threshold: event.thresholdHit,
      status: "missing_vendor",
    };
  }
  const clinic = await getClinic(event.baa.clinicId);
  const clinicName = clinic?.name ?? "Central Mississippi Health District";
  const hipaaOfficerName = clinic?.hipaaOfficer ?? "HIPAA Privacy Officer";

  let to: string | null = null;
  let payload: { subject: string; html: string; text: string } | null = null;

  if (event.kind === "expiration") {
    to = vendor.contactEmail;
    payload = reminderEmail({
      vendorName: vendor.name,
      contactName: vendor.contactName,
      clinicName,
      baaId: event.baa.id,
      daysUntilExpiration: event.daysRelevant,
      renewalUrl: `${baseUrl}/sign/${event.baa.id}`,
    });
  } else if (event.kind === "pending_signature") {
    to = vendor.contactEmail;
    payload = pendingSignatureReminderEmail({
      vendorName: vendor.name,
      contactName: vendor.contactName,
      clinicName,
      baaId: event.baa.id,
      daysSinceInvitation: event.daysRelevant,
      signingUrl: `${baseUrl}/sign/${event.baa.id}`,
    });
  } else if (event.kind === "pending_countersignature") {
    to = clinic?.contactEmail ?? ADMIN_EMAIL_FALLBACK;
    payload = pendingCounterSignReminderEmail({
      hipaaOfficerName,
      vendorName: vendor.name,
      clinicName,
      baaId: event.baa.id,
      daysSinceVendorSigned: event.daysRelevant,
      vendorSignerName: event.baa.signedBy ?? vendor.contactName,
      dashboardUrl: `${baseUrl}/dashboard`,
    });
  }

  if (!to || !payload) {
    return {
      baaId: event.baa.id,
      kind: event.kind,
      threshold: event.thresholdHit,
      status: "missing_email",
    };
  }

  const result = await sendEmail({ to, ...payload });
  if (!result.success) {
    return {
      baaId: event.baa.id,
      kind: event.kind,
      threshold: event.thresholdHit,
      status: "failed",
      detail: result.error,
    };
  }

  const nowIso = new Date(now).toISOString();
  const nextHistory = {
    ...(event.baa.reminderHistory ?? {}),
    [key]: nowIso,
  };
  await updateBAA(event.baa.id, { reminderHistory: nextHistory });
  await addAuditLog({
    baaId: event.baa.id,
    vendorId: event.baa.vendorId,
    action: `Reminder sent (${event.kind} @ ${event.thresholdHit}d)`,
    performedBy: opts.performedBy,
    details: {
      kind: event.kind,
      threshold: event.thresholdHit,
      to,
      messageId: result.messageId ?? null,
      manual: opts.force === true,
    },
    ipAddress: null,
  });

  logger.info("Reminder sent", {
    baaId: event.baa.id,
    kind: event.kind,
    threshold: event.thresholdHit,
    performedBy: opts.performedBy,
  });

  return {
    baaId: event.baa.id,
    kind: event.kind,
    threshold: event.thresholdHit,
    status: "sent",
    detail: result.messageId,
  };
}
