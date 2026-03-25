import { NextResponse } from "next/server";

export async function GET() {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const provider = hasGemini ? "gemini" : hasOpenAI ? "openai" : "none";

  return NextResponse.json({
    available: hasGemini || hasOpenAI,
    provider,
  });
}
