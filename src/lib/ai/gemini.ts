import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "@/lib/logger";

let clientInstance: GoogleGenerativeAI | null = null;

export function isGeminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export function getGeminiClient(): GoogleGenerativeAI {
  if (!clientInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error("GEMINI_API_KEY environment variable is not set");
      throw new Error("GEMINI_API_KEY is not configured");
    }
    clientInstance = new GoogleGenerativeAI(apiKey);
    logger.info("Gemini client initialized");
  }
  return clientInstance;
}

export const GEMINI_MODEL = "gemini-2.0-flash";

/**
 * Stream a chat response from Gemini.
 * Accepts the same system prompt + messages format as OpenAI,
 * returns a ReadableStream of SSE events.
 */
export async function streamGeminiChat(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<ReadableStream> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemPrompt,
  });

  // Convert messages to Gemini format
  const history = messages.slice(0, -1).map((msg) => ({
    role: msg.role === "assistant" ? "model" as const : "user" as const,
    parts: [{ text: msg.content }],
  }));

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "user") {
    throw new Error("Last message must be from user");
  }

  const chat = model.startChat({
    history,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
    },
  });

  const result = await chat.sendMessageStream(lastMessage.content);

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        logger.error("Gemini stream error", { error: errMsg });
        // If rate limited, send a friendly message instead of crashing
        if (errMsg.includes("429") || errMsg.includes("RATE_LIMIT") || errMsg.includes("quota")) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: "\n\n⚠️ AI rate limit reached. The free tier allows 15 requests per minute. Please wait a moment and try again." })}\n\n`)
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } else {
          controller.error(error);
        }
      }
    },
  });

  return readableStream;
}
