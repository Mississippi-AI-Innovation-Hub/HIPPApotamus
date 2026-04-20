import { NextRequest, NextResponse } from "next/server";
import {
  getBAAsByStatus,
  getVendorById,
  getClinic,
  updateBAA,
  addAuditLog,
} from "@/lib/db";
import {
  computeReminderEvents,
  reminderKey,
  type ReminderEvent,
} from "@/lib/reminders/policy";
import {
  reminderEmail,
  pendingSignatureReminderEmail,
  pendingCounterSignReminderEmail,
} from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/sender";
import { logger } from "@/lib/logger";
import type { BAA, Vendor, Clinic } from "@/types";

/**
 * POST /api/cron/reminders
 *
 * Triggered by an external scheduler (EventBridge / Vercel Cron / GitHub
 * Actions). Iterates BAAs in actionable statuses, sends reminders that match
 * staleness thresholds, and writes the send timestamp to reminderHistory so
 * the same threshold isn't re-sent within 24 hours.
 *
 * Auth: requires `Authorization: Bearer ${CRON_SECRET}` header. If
 * CRON_SECRET is unset the endpoint refuses to run (fail closed) so an
 * accidentally exposed deployment cannot blast emails.
 */
const ONE_DAY_MS = 23 * 60 * 60 * 1000;

const ADMIN_EMAIL_FALLBACK =
  process.env.ADMIN_EMAIL ?? "bipuladk60+clinic@gmail.com";

interface SendOutcome {
  baaId: string;
  kind: ReminderEvent["kind"];
  threshold: number;
  status: "sent" | "skipped_recent" | "missing_vendor" | "missing_email" | "failed";
  detail?: string;
}

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    logger.warn("CRON_SECRET unset — refusing to run reminder cron");
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }

  // Accept either `X-Cron-Auth: <secret>` (EventBridge ApiDestination
  // sends this via the Connection's API key auth) or
  // `Authorization: Bearer <secret>` (curl / local invocation).
  const headerSecret = request.headers.get("x-cron-auth");
  const bearer = request.headers.get("authorization");
  const ok = headerSecret === secret || bearer === `Bearer ${secret}`;
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const [expiring, expired, pendingSig, pendingCtr] = await Promise.all([
      getBAAsByStatus("expiring_soon"),
      getBAAsByStatus("expired"),
      getBAAsByStatus("pending_signature"),
      getBAAsByStatus("pending_countersignature"),
    ]);

    const allBaas: BAA[] = [...expiring, ...expired, ...pendingSig, ...pendingCtr];
    const vendorCache = new Map<string, Vendor | null>();
    const clinicCache = new Map<string, Clinic | null>();

    async function vendorFor(id: string): Promise<Vendor | null> {
      if (vendorCache.has(id)) return vendorCache.get(id) ?? null;
      const v = await getVendorById(id);
      vendorCache.set(id, v);
      return v;
    }
    async function clinicFor(id: string): Promise<Clinic | null> {
      if (clinicCache.has(id)) return clinicCache.get(id) ?? null;
      const c = await getClinic(id);
      clinicCache.set(id, c);
      return c;
    }

    const events = computeReminderEvents(allBaas);
    const outcomes: SendOutcome[] = [];
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    for (const event of events) {
      const key = reminderKey(event);
      const lastSent = event.baa.reminderHistory?.[key];
      if (lastSent && now - new Date(lastSent).getTime() < ONE_DAY_MS) {
        outcomes.push({
          baaId: event.baa.id,
          kind: event.kind,
          threshold: event.thresholdHit,
          status: "skipped_recent",
          detail: `last sent ${lastSent}`,
        });
        continue;
      }

      const vendor = await vendorFor(event.baa.vendorId);
      if (!vendor) {
        outcomes.push({
          baaId: event.baa.id,
          kind: event.kind,
          threshold: event.thresholdHit,
          status: "missing_vendor",
        });
        continue;
      }
      const clinic = await clinicFor(event.baa.clinicId);
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
        outcomes.push({
          baaId: event.baa.id,
          kind: event.kind,
          threshold: event.thresholdHit,
          status: "missing_email",
        });
        continue;
      }

      const result = await sendEmail({ to, ...payload });
      if (!result.success) {
        outcomes.push({
          baaId: event.baa.id,
          kind: event.kind,
          threshold: event.thresholdHit,
          status: "failed",
          detail: result.error,
        });
        continue;
      }

      const nextHistory = {
        ...(event.baa.reminderHistory ?? {}),
        [key]: nowIso,
      };
      await updateBAA(event.baa.id, { reminderHistory: nextHistory });
      await addAuditLog({
        baaId: event.baa.id,
        vendorId: event.baa.vendorId,
        action: `Reminder sent (${event.kind} @ ${event.thresholdHit}d)`,
        performedBy: "cron:reminders",
        details: {
          kind: event.kind,
          threshold: event.thresholdHit,
          to,
          messageId: result.messageId ?? null,
        },
        ipAddress: null,
      });

      outcomes.push({
        baaId: event.baa.id,
        kind: event.kind,
        threshold: event.thresholdHit,
        status: "sent",
        detail: result.messageId,
      });
    }

    const summary = {
      sent: outcomes.filter((o) => o.status === "sent").length,
      skipped: outcomes.filter((o) => o.status === "skipped_recent").length,
      failed: outcomes.filter((o) => o.status === "failed").length,
      total: outcomes.length,
    };

    logger.info("Reminder cron run complete", summary);

    return NextResponse.json({ summary, outcomes });
  } catch (error) {
    logger.error("Reminder cron failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Reminder cron failed" },
      { status: 500 },
    );
  }
}
