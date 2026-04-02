import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import { getBAAById } from "@/lib/db";
import { generateSigningToken } from "@/lib/signing/token";

/**
 * GET /api/baas/[id]/signing-link
 * Generates a signed URL for the vendor to access the signing page.
 * Requires admin session.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await getRequiredSession();
    const { id } = await context.params;

    const baa = await getBAAById(id);
    if (!baa) {
      return NextResponse.json({ error: "BAA not found" }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const token = generateSigningToken(baa.id, baa.vendorId);
    const signingUrl = `${baseUrl}/sign/${baa.id}?token=${token}`;

    return NextResponse.json({ signingUrl, token });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
