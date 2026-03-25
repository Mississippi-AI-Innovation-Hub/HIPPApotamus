import OpenAI from "openai";
import { logger } from "@/lib/logger";
import { isGeminiAvailable } from "./gemini";

let clientInstance: OpenAI | null = null;

/**
 * Check if ANY AI provider is available.
 * Prefers: Gemini (free) → OpenAI → Bedrock (future)
 */
export function isAIAvailable(): boolean {
  return isGeminiAvailable() || !!process.env.OPENAI_API_KEY;
}

/**
 * Get the active AI provider name.
 */
export function getAIProvider(): "gemini" | "openai" | "none" {
  if (isGeminiAvailable()) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "none";
}

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

export const AI_MODEL = "gpt-4o" as const;
