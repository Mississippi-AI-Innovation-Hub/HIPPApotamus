import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import { getBAAById } from "@/lib/db";
import { computeReminderEvents } from "@/lib/reminders/policy";
import { sendReminderForEvent } from "@/lib/reminders/sender";
import { logger } from "@/lib/logger";
import type { ReminderEvent } from "@/lib/reminders/policy";

/**
 * POST /api/reminders/send-one
 *
 * Manual-send endpoint used by the Reminders dashboard. Authenticated
 * (admin session). Sends one reminder for a specific BAA + kind, going
 * through the same shared sender as the cron — which means the manual
 * send also writes BAA.reminderHistory so the dashboard's "last sent"
 * display stays accurate.
 *
 * Body: { baaId: string, kind: "expiration" | "pending_signature" | "pending_countersignature" }
 * Forced: true — bypasses the 24h dedupe so an admin can resend on demand.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getRequiredSession();
    const body = (await request.json()) as {
      baaId?: string;
      kind?: ReminderEvent["kind"];
    };

    if (!body.baaId || !body.kind) {
      return NextResponse.json(
        { error: "baaId and kind are required" },
        { status: 400 },
      );
    }

    const baa = await getBAAById(body.baaId);
    if (!baa) {
      return NextResponse.json({ error: "BAA not found" }, { status: 404 });
    }

    // Recompute events for this BAA only and pick the matching kind.
    // Using the shared policy means we never use a stale threshold value
    // from a UI that opened hours ago.
    const events = computeReminderEvents([baa]);
    const event = events.find((e) => e.kind === body.kind);
    if (!event) {
      return NextResponse.json(
        {
          error: `BAA is not currently in a state that warrants a "${body.kind}" reminder`,
        },
        { status: 400 },
      );
    }

    const outcome = await sendReminderForEvent(event, {
      performedBy: session.email ?? session.name ?? "admin",
      force: true,
    });

    if (outcome.status === "sent") {
      return NextResponse.json({ outcome });
    }

    return NextResponse.json(
      { error: outcome.detail ?? outcome.status, outcome },
      { status: outcome.status === "failed" ? 502 : 400 },
    );
  } catch (error) {
    logger.error("POST /api/reminders/send-one failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to send reminder" },
      { status: 500 },
    );
  }
}
