import OpenAI from "openai";
import { logger } from "@/lib/logger";

let clientInstance: OpenAI | null = null;

/**
 * Returns a singleton OpenAI client. The API key is read from the
 * OPENAI_API_KEY environment variable at first access.
 */
export function getOpenAIClient(): OpenAI {
  if (!clientInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.error("OPENAI_API_KEY environment variable is not set");
      throw new Error("OPENAI_API_KEY is not configured");
    }
    clientInstance = new OpenAI({ apiKey });
    logger.info("OpenAI client initialized");
  }
  return clientInstance;
}

/** The model used for all AI agent interactions. */
export const AI_MODEL = "gpt-4o" as const;
