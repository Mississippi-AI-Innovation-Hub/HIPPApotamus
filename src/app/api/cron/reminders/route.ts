import { NextRequest, NextResponse } from "next/server";
import { getBAAsByStatus } from "@/lib/db";
import { computeReminderEvents } from "@/lib/reminders/policy";
import { sendReminderForEvent, type SendOutcome } from "@/lib/reminders/sender";
import { logger } from "@/lib/logger";
import type { BAA } from "@/types";

/**
 * POST /api/cron/reminders
 *
 * Triggered by an external scheduler (EventBridge / Vercel Cron / GitHub
 * Actions). Iterates BAAs in actionable statuses and delegates each event
 * to the shared sender, which writes BAA.reminderHistory so the same
 * threshold isn't re-sent within 24 hours.
 *
 * Auth: requires `X-Cron-Auth: <CRON_SECRET>` (set by EventBridge
 * ApiDestination via API key auth) OR
 * `Authorization: Bearer <CRON_SECRET>` (curl / local invocation).
 * If CRON_SECRET is unset the endpoint refuses to run (fail closed).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    logger.warn("CRON_SECRET unset — refusing to run reminder cron");
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }

  const headerSecret = request.headers.get("x-cron-auth");
  const bearer = request.headers.get("authorization");
  if (headerSecret !== secret && bearer !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [expiring, expired, pendingSig, pendingCtr] = await Promise.all([
      getBAAsByStatus("expiring_soon"),
      getBAAsByStatus("expired"),
      getBAAsByStatus("pending_signature"),
      getBAAsByStatus("pending_countersignature"),
    ]);

    const allBaas: BAA[] = [...expiring, ...expired, ...pendingSig, ...pendingCtr];
    const events = computeReminderEvents(allBaas);

    const outcomes: SendOutcome[] = [];
    for (const event of events) {
      outcomes.push(
        await sendReminderForEvent(event, { performedBy: "cron:reminders" }),
      );
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
