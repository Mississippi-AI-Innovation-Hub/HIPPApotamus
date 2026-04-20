import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import {
  getBAAs,
  getBAAsByStatus,
  getBAAsByVendor,
  createBAA,
  addAuditLog,
} from "@/lib/db";
import { logger } from "@/lib/logger";
import type { BAAStatus, ContractType } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const session = await getRequiredSession();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as BAAStatus | null;
    const vendorId = searchParams.get("vendorId");

    if (vendorId) {
      const baas = await getBAAsByVendor(vendorId);
      return NextResponse.json({ baas });
    }

    if (status) {
      const baas = await getBAAsByStatus(status);
      return NextResponse.json({ baas });
    }

    const clinicId =
      session.role === "admin" ? session.entityId : "clinic-001";
    const baas = await getBAAs(clinicId);
    return NextResponse.json({ baas });
  } catch (error) {
    logger.error("GET /api/baas failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch BAAs", code: "FETCH_BAAS_ERROR" },
      { status: 500 },
    );
  }
}

interface CreateBAABody {
  vendorId: string;
  clinicId?: string;
  contractType: ContractType;
  effectiveDate: string;
  expirationDate: string;
  templateVersion?: string;
  termYears?: 1 | 2;
  requiresStateLawRetentionNotice?: boolean;
  source?: "generated" | "uploaded";
}

export async function POST(request: NextRequest) {
  try {
    const session = await getRequiredSession();
    const body = (await request.json()) as CreateBAABody;

    if (!body.vendorId || !body.contractType || !body.effectiveDate || !body.expirationDate) {
      return NextResponse.json(
        {
          error: "Missing required fields: vendorId, contractType, effectiveDate, expirationDate",
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    const clinicId =
      body.clinicId ??
      (session.role === "admin" ? session.entityId : "clinic-001");

    const baa = await createBAA({
      vendorId: body.vendorId,
      clinicId,
      contractType: body.contractType,
      status: "pending_signature",
      effectiveDate: body.effectiveDate,
      expirationDate: body.expirationDate,
      signedDate: null,
      signedBy: null,
      documentUrl: null,
      signedDocumentUrl: null,
      signedDocumentHash: null,
      kmsSignature: null,
      kmsKeyArn: null,
      signingCertificate: null,
      signedSnapshot: null,
      documentVersion: 1,
      parentBaaId: null,
      versionType: "original",
      terminationDate: null,
      terminationReason: null,
      terminationNotes: null,
      terminatedBy: null,
      counterSignedDate: null,
      counterSignedBy: null,
      counterSignerTitle: null,
      templateVersion: body.templateVersion ?? "2026.1",
      termYears: body.termYears ?? 2,
      requiresStateLawRetentionNotice:
        body.requiresStateLawRetentionNotice ?? false,
      source: body.source ?? "generated",
      uploadedBy: null,
      uploadedAt: null,
      legalReviewedBy: null,
      legalReviewedAt: null,
    });

    await addAuditLog({
      baaId: baa.id,
      vendorId: baa.vendorId,
      action: "BAA created",
      performedBy: session.name ?? session.email,
      details: {
        contractType: baa.contractType,
        effectiveDate: baa.effectiveDate,
        expirationDate: baa.expirationDate,
      },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    return NextResponse.json({ baa }, { status: 201 });
  } catch (error) {
    logger.error("POST /api/baas failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to create BAA", code: "CREATE_BAA_ERROR" },
      { status: 500 },
    );
  }
}
