import { NextResponse, type NextRequest } from "next/server";
import { getOpenAIClient, AI_MODEL } from "@/lib/ai/openai";
import {
  contractAgentPrompt,
  vendorAgentPrompt,
  coordinatorAgentPrompt,
} from "@/lib/ai/systemPrompts";
import {
  getRequiredSession,
  requireRole,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/auth/session";
import {
  getBAAById,
  getVendorById,
  getAuditLogsByBAA,
  getBAAs,
  getVendors,
  getRecentAuditLogs,
  getBAAsByVendor,
  getClinic,
} from "@/lib/db";
import { logger } from "@/lib/logger";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// ─── Types ───────────────────────────────────────────────────────────────────

const VALID_CONTEXTS = ["contract", "vendor", "global"] as const;
type AgentContext = (typeof VALID_CONTEXTS)[number];

interface ChatRequestBody {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  contextId?: string;
}

function isValidContext(value: string): value is AgentContext {
  return VALID_CONTEXTS.includes(value as AgentContext);
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ context: string }> },
): Promise<NextResponse | Response> {
  try {
    const { context } = await params;

    // Validate context
    if (!isValidContext(context)) {
      return NextResponse.json(
        { error: `Invalid context: ${context}. Must be one of: ${VALID_CONTEXTS.join(", ")}` },
        { status: 400 },
      );
    }

    // Auth
    const session = await getRequiredSession();

    // Parse body
    const body = (await request.json()) as ChatRequestBody;
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: "messages array is required and must not be empty" },
        { status: 400 },
      );
    }

    // Build system prompt based on context
    let systemPrompt: string;

    if (context === "contract") {
      requireRole(session, "admin");

      if (!body.contextId) {
        return NextResponse.json(
          { error: "contextId (baaId) is required for contract context" },
          { status: 400 },
        );
      }

      const baa = await getBAAById(body.contextId);
      if (!baa) {
        return NextResponse.json({ error: "BAA not found" }, { status: 404 });
      }

      const vendor = await getVendorById(baa.vendorId);
      if (!vendor) {
        return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
      }

      const auditLogs = await getAuditLogsByBAA(baa.id);
      const clinic = await getClinic(baa.clinicId);

      systemPrompt = contractAgentPrompt(baa, vendor, auditLogs, clinic);
    } else if (context === "vendor") {
      // Vendor context: vendor users can only access their own data
      const vendorId = body.contextId ?? session.entityId;

      if (session.role === "vendor" && vendorId !== session.entityId) {
        throw new ForbiddenError("You can only access your own vendor data");
      }

      const vendor = await getVendorById(vendorId);
      if (!vendor) {
        return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
      }

      const baas = await getBAAsByVendor(vendorId);
      const clinic = await getClinic(baas[0]?.clinicId ?? "");

      systemPrompt = vendorAgentPrompt(vendor, baas, clinic);
    } else {
      // global context: admin only
      requireRole(session, "admin");

      const allBAAs = await getBAAs(session.entityId);
      const vendors = await getVendors(session.entityId);
      const recentLogs = await getRecentAuditLogs(20);
      const clinic = await getClinic(session.entityId);

      systemPrompt = coordinatorAgentPrompt(allBAAs, vendors, recentLogs, clinic);
    }

    // Build messages array for OpenAI
    const chatMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...body.messages.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
    ];

    logger.info("AI chat request", {
      context,
      userId: session.id,
      messageCount: body.messages.length,
    });

    // Stream response
    const openai = getOpenAIClient();
    const stream = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: chatMessages,
      stream: true,
      temperature: 0.3,
      max_tokens: 2048,
    });

    // Create a ReadableStream from the OpenAI stream
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          logger.error("Stream error", { error: String(error) });
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    logger.error("Chat API error", { error: String(error) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
