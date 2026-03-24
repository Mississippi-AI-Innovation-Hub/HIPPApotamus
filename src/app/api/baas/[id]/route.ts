import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import { getBAAById, updateBAA, deleteBAA, addAuditLog } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { BAAStatus, ContractType } from "@/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    await getRequiredSession();
    const { id } = await context.params;
    const baa = await getBAAById(id);

    if (!baa) {
      return NextResponse.json(
        { error: "BAA not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({ baa });
  } catch (error) {
    logger.error("GET /api/baas/[id] failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch BAA", code: "FETCH_BAA_ERROR" },
      { status: 500 },
    );
  }
}

interface UpdateBAABody {
  status?: BAAStatus;
  contractType?: ContractType;
  effectiveDate?: string;
  expirationDate?: string;
  documentUrl?: string;
  templateVersion?: string;
  termYears?: 1 | 2;
  requiresStateLawRetentionNotice?: boolean;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await getRequiredSession();
    const { id } = await context.params;
    const body = (await request.json()) as UpdateBAABody;

    const baa = await updateBAA(id, body);

    if (!baa) {
      return NextResponse.json(
        { error: "BAA not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    await addAuditLog({
      baaId: id,
      vendorId: baa.vendorId,
      action: "BAA updated",
      performedBy: session.name ?? session.email,
      details: { updatedFields: Object.keys(body).join(", ") },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    return NextResponse.json({ baa });
  } catch (error) {
    logger.error("PATCH /api/baas/[id] failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to update BAA", code: "UPDATE_BAA_ERROR" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await getRequiredSession();
    const { id } = await context.params;

    const baa = await getBAAById(id);
    if (!baa) {
      return NextResponse.json(
        { error: "BAA not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    await addAuditLog({
      baaId: id,
      vendorId: baa.vendorId,
      action: "BAA deleted",
      performedBy: session.name ?? session.email,
      details: { status: baa.status },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    const deleted = await deleteBAA(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Failed to delete BAA", code: "DELETE_FAILED" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("DELETE /api/baas/[id] failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to delete BAA", code: "DELETE_BAA_ERROR" },
      { status: 500 },
    );
  }
}
