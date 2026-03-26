// @ts-nocheck — AI SDK v6 + Zod v4 type mismatch; works at runtime
import { type NextRequest, NextResponse } from "next/server";
import { streamText, tool, jsonSchema, stepCountIs } from "ai";
import { google } from "@ai-sdk/google";
import {
  getRequiredSession,
  UnauthorizedError,
  ForbiddenError,
  type RequiredSessionUser,
} from "@/lib/auth/session";
import {
  getVendors,
  getVendorById,
  getBAAs,
  getBAAById,
  getBAAsByStatus,
  getRecentAuditLogs,
  addAuditLog,
  getClinic,
} from "@/lib/db";
import { logger } from "@/lib/logger";
import type { BAAStatus } from "@/types";

// ─── Env-var alias ──────────────────────────────────────────────────────────
// @ai-sdk/google reads GOOGLE_GENERATIVE_AI_API_KEY by default.
// Our project stores the key as GEMINI_API_KEY, so bridge the two.
if (process.env.GEMINI_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function statusLabel(status: BAAStatus): string {
  const map: Record<BAAStatus, string> = {
    active: "Active",
    expiring_soon: "Expiring Soon",
    expired: "Expired",
    pending_signature: "Pending Signature",
  };
  return map[status] ?? status;
}

// ─── System Prompt Builder ──────────────────────────────────────────────────

async function buildAgentSystemPrompt(
  session: RequiredSessionUser,
): Promise<string> {
  const [vendors, baas, recentLogs, clinic] = await Promise.all([
    getVendors(session.entityId),
    getBAAs(session.entityId),
    getRecentAuditLogs(20),
    getClinic(session.entityId),
  ]);

  const clinicName = clinic?.name ?? "Central Mississippi Health District";

  // ── Vendor summary
  const vendorBlock =
    vendors.length > 0
      ? vendors
          .map(
            (v) =>
              `- ${v.name} (ID: ${v.id}, Type: ${v.type}, Contact: ${v.contactName} <${v.contactEmail}>)`,
          )
          .join("\n")
      : "No vendors registered.";

  // ── BAA summary
  const statusCounts = { active: 0, expiring_soon: 0, expired: 0, pending_signature: 0 };
  for (const b of baas) {
    statusCounts[b.status]++;
  }

  const baaBlock =
    baas.length > 0
      ? baas
          .map((b) => {
            const vendor = vendors.find((v) => v.id === b.vendorId);
            return `- ${b.id}: ${vendor?.name ?? "Unknown vendor"} | ${statusLabel(b.status)} | Expires: ${fmtDate(b.expirationDate)}`;
          })
          .join("\n")
      : "No BAAs on file.";

  // ── Activity summary
  const activityBlock =
    recentLogs.length > 0
      ? recentLogs
          .slice(0, 15)
          .map(
            (l) =>
              `- [${fmtDate(l.performedAt)}] ${l.action} -- BAA: ${l.baaId} (by ${l.performedBy})`,
          )
          .join("\n")
      : "No recent activity.";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `You are HIPAA Copilot, an AI compliance assistant for HIPAApotamus -- the HIPAA BAA management platform used by ${clinicName}, part of the Mississippi Department of Health.

Today is ${today}. The logged-in user is ${session.name} (${session.email}, role: ${session.role}).

═══════════════════════════════════════════
PORTFOLIO SUMMARY
═══════════════════════════════════════════
Total BAAs: ${baas.length}
  Active: ${statusCounts.active}
  Expiring Soon: ${statusCounts.expiring_soon}
  Expired: ${statusCounts.expired}
  Pending Signature: ${statusCounts.pending_signature}

═══════════════════════════════════════════
REGISTERED VENDORS (${vendors.length})
═══════════════════════════════════════════
${vendorBlock}

═══════════════════════════════════════════
ALL BAAs
═══════════════════════════════════════════
${baaBlock}

═══════════════════════════════════════════
RECENT ACTIVITY
═══════════════════════════════════════════
${activityBlock}

═══════════════════════════════════════════
INSTRUCTIONS
═══════════════════════════════════════════
1. Answer questions directly when the data above is sufficient. Do NOT call a tool if you already have the answer.
2. Use tools when you need live/detailed data not in the summary above, or to perform an action.
3. ALWAYS explain what you are about to do BEFORE calling a tool. For example: "Let me look up the details of that contract..." then call getBAADetails.
4. When referencing a contract, vendor, or page, use the navigateTo tool to give the user a clickable link. Relevant pages:
   - Dashboard: /dashboard
   - Contracts list: /dashboard/contracts
   - Specific contract: /dashboard/contracts?baaId={baaId}
   - Vendors list: /dashboard/vendors
   - Specific vendor: /dashboard/vendors/{vendorId}
   - Audit log: /dashboard/audit-log
   - Settings: /dashboard/settings
5. For the sendReminder tool: ALWAYS describe what you will do and who will receive the email. Ask for explicit confirmation before calling it.
6. Be concise but thorough. Use bullet points and structured formatting.
7. Reference HIPAA regulations (45 CFR Part 164) and Mississippi state law (10-year medical records retention) when relevant.
8. Flag compliance risks prominently -- expiring contracts, missing signatures, overdue renewals.
9. Do not fabricate information. If you don't know, say so.
10. Do not provide legal advice. Recommend consulting legal counsel for complex compliance questions.`;
}

// ─── Route Handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Auth
    const session = await getRequiredSession();

    // Parse body
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages array is required and must not be empty" },
        { status: 400 },
      );
    }

    // Check AI availability
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "AI is not available. Set GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY in your environment.",
        },
        { status: 503 },
      );
    }

    // Build system prompt with live data
    const systemPrompt = await buildAgentSystemPrompt(session);

    logger.info("AI chat request (agentic)", {
      userId: session.id,
      messageCount: messages.length,
    });

    // ── Tools ─────────────────────────────────────────────────────────────────

    const result = streamText({
      model: google("gemini-2.0-flash"),
      system: systemPrompt,
      messages,
      stopWhen: stepCountIs(5),
      tools: {
        // 1. navigateTo — client-side only (no execute)
        navigateTo: tool({
          description: "Navigate the user to a page in the app. Use this when referencing contracts, vendors, or any page so the user gets a clickable link.",
          parameters: jsonSchema({
            type: "object",
            properties: {
              path: { type: "string", description: "URL path like /dashboard/contracts?baaId=baa-001" },
              label: { type: "string", description: "Human-readable link text" },
            },
            required: ["path", "label"],
          } as const),
        }),

        // 2. getBAADetails — server-side
        getBAADetails: tool({
          description: "Look up full details of a specific BAA contract by ID, including the associated vendor name.",
          parameters: jsonSchema({
            type: "object",
            properties: {
              baaId: { type: "string", description: "The BAA ID, e.g. baa-001" },
            },
            required: ["baaId"],
          } as const),
          execute: async ({ baaId }: { baaId: string }) => {
            const baa = await getBAAById(baaId);
            if (!baa) return { error: "BAA not found" };
            const vendor = await getVendorById(baa.vendorId);
            return {
              ...baa,
              vendorName: vendor?.name ?? "Unknown",
              vendorContactEmail: vendor?.contactEmail ?? "Unknown",
            };
          },
        }),

        // 3. getVendorDetails — server-side
        getVendorDetails: tool({
          description: "Look up detailed vendor information including contact details, SLA, and compliance requirements.",
          parameters: jsonSchema({
            type: "object",
            properties: {
              vendorId: { type: "string", description: "The vendor ID" },
            },
            required: ["vendorId"],
          } as const),
          execute: async ({ vendorId }: { vendorId: string }) => {
            const vendor = await getVendorById(vendorId);
            return vendor ?? { error: "Vendor not found" };
          },
        }),

        // 4. searchContracts — server-side
        searchContracts: tool({
          description: "Search BAA contracts by status. Use when the user asks about expiring, active, pending, or expired contracts.",
          parameters: jsonSchema({
            type: "object",
            properties: {
              status: { type: "string", enum: ["active", "expiring_soon", "expired", "pending_signature"], description: "Filter by status. Omit to return all." },
            },
          } as const),
          execute: async ({ status }: { status?: string }) => {
            const results = status
              ? await getBAAsByStatus(status as "active" | "expiring_soon" | "expired" | "pending_signature")
              : await getBAAs(session.entityId);
            const withVendors = await Promise.all(
              results.map(async (baa) => {
                const vendor = await getVendorById(baa.vendorId);
                return {
                  id: baa.id,
                  vendorName: vendor?.name ?? "Unknown",
                  vendorId: baa.vendorId,
                  status: baa.status,
                  effectiveDate: baa.effectiveDate,
                  expirationDate: baa.expirationDate,
                  contractType: baa.contractType,
                };
              }),
            );
            return { count: withVendors.length, contracts: withVendors };
          },
        }),

        // 5. sendReminder — server-side
        sendReminder: tool({
          description: "Send an expiration reminder email to a vendor contact. IMPORTANT: Always explain what you will do and ask for the user's explicit confirmation before calling this tool.",
          parameters: jsonSchema({
            type: "object",
            properties: {
              baaId: { type: "string", description: "The BAA ID" },
              vendorId: { type: "string", description: "The vendor ID" },
              vendorName: { type: "string", description: "Display name of the vendor" },
              vendorEmail: { type: "string", description: "Email address to send reminder to" },
            },
            required: ["baaId", "vendorId", "vendorName", "vendorEmail"],
          } as const),
          execute: async ({ baaId, vendorId, vendorName, vendorEmail }: { baaId: string; vendorId: string; vendorName: string; vendorEmail: string }) => {
            const baa = await getBAAById(baaId);
            if (!baa) return { error: "BAA not found" };

            const daysLeft = Math.ceil(
              (new Date(baa.expirationDate).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24),
            );

            try {
              const { sendEmail } = await import("@/lib/email/sender");
              const { reminderEmail } = await import("@/lib/email/templates");

              const content = reminderEmail({
                vendorName,
                contactName: vendorName,
                clinicName: "Central Mississippi Health District",
                baaId,
                daysUntilExpiration: daysLeft,
                renewalUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.hipaapotamus.com"}/sign/${baaId}`,
              });

              const result = await sendEmail({ to: vendorEmail, ...content });

              if (result.success) {
                await addAuditLog({
                  baaId,
                  vendorId,
                  action: "Reminder sent by AI Copilot",
                  performedBy: "HIPAA Copilot",
                  details: { to: vendorEmail, daysLeft },
                  ipAddress: null,
                });
                return {
                  success: true,
                  message: `Reminder email sent to ${vendorEmail}. ${daysLeft} days until expiration.`,
                };
              }
              return { success: false, error: result.error };
            } catch (err) {
              logger.error("sendReminder tool error", { error: String(err) });
              return {
                success: false,
                error:
                  "Email service is not configured. The reminder could not be sent.",
              };
            }
          },
        }),

        // 6. getRecentActivity — server-side
        getRecentActivity: tool({
          description: "Get the most recent audit log entries showing actions taken in the system.",
          parameters: jsonSchema({
            type: "object",
            properties: {
              limit: { type: "number", description: "Number of entries to return (default 10)" },
            },
          } as const),
          execute: async ({ limit }: { limit?: number }) => {
            const logs = await getRecentAuditLogs(limit ?? 10);
            return logs.map((l) => ({
              action: l.action,
              performedBy: l.performedBy,
              performedAt: l.performedAt,
              baaId: l.baaId,
              vendorId: l.vendorId,
            }));
          },
        }),

        // 7. getComplianceOverview — server-side
        getComplianceOverview: tool({
          description: "Get a summary of the compliance status: counts of active, expiring, expired, and pending contracts.",
          parameters: jsonSchema({ type: "object", properties: {} } as const),
          execute: async () => {
            const all = await getBAAs(session.entityId);
            return {
              total: all.length,
              active: all.filter((b) => b.status === "active").length,
              expiringSoon: all.filter((b) => b.status === "expiring_soon")
                .length,
              expired: all.filter((b) => b.status === "expired").length,
              pendingSignature: all.filter(
                (b) => b.status === "pending_signature",
              ).length,
            };
          },
        }),
      },
    });

    return result.toDataStreamResponse({ sendReasoning: false });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    logger.error("Chat API error (agentic)", { error: String(error) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
