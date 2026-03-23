import { NextResponse, type NextRequest } from "next/server";
import {
  getRequiredSession,
  UnauthorizedError,
} from "@/lib/auth/session";
import { logger } from "@/lib/logger";

const MAX_TEXT_LENGTH = 500;
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";

interface TTSRequestBody {
  text: string;
  voiceId?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse | Response> {
  try {
    await getRequiredSession();

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      logger.error("ELEVENLABS_API_KEY is not configured");
      return NextResponse.json(
        { error: "TTS service is not configured" },
        { status: 503 },
      );
    }

    const body = (await request.json()) as TTSRequestBody;

    if (!body.text || typeof body.text !== "string") {
      return NextResponse.json(
        { error: "text field is required" },
        { status: 400 },
      );
    }

    if (body.text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Text must be ${MAX_TEXT_LENGTH} characters or less. Received ${body.text.length}.` },
        { status: 400 },
      );
    }

    // Default voice - "Rachel" from ElevenLabs
    const voiceId = body.voiceId ?? "21m00Tcm4TlvDq8ikWAM";

    logger.info("TTS request", { textLength: body.text.length, voiceId });

    const ttsResponse = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: body.text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text().catch(() => "Unknown error");
      logger.error("ElevenLabs API error", {
        status: ttsResponse.status,
        error: errorText,
      });
      return NextResponse.json(
        { error: "TTS generation failed" },
        { status: 502 },
      );
    }

    const audioBuffer = await ttsResponse.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    logger.error("TTS API error", { error: String(error) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
