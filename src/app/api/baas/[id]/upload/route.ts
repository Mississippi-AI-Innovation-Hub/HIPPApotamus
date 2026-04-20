import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession, requireRole } from "@/lib/auth/session";
import { getBAAById, updateBAA, addAuditLog } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * PUT /api/baas/[id]/upload — Admin-only upload exception path.
 *
 * Accepts a vendor-supplied BAA PDF when the vendor insists on their own paper
 * (e.g., AWS, Google, Microsoft, Epic). Requires a legalReviewedBy name as attestation.
 *
 * In production this stores to S3 as `signed-documents/{id}-v{N}-uploaded.pdf`.
 * In dev mode it stores a base64 data URL on the BAA record.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getRequiredSession();
    requireRole(session, "admin");

    const { id } = await params;
    const baa = await getBAAById(id);
    if (!baa) {
      return NextResponse.json(
        { error: "BAA not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const legalReviewedBy = formData.get("legalReviewedBy") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "Missing file in form data", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (!legalReviewedBy || legalReviewedBy.trim().length === 0) {
      return NextResponse.json(
        {
          error: "legalReviewedBy is required — uploaded BAAs must have a legal reviewer attestation",
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are accepted", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const maxSizeMB = 25;
    if (file.size > maxSizeMB * 1024 * 1024) {
      return NextResponse.json(
        { error: `File size exceeds ${maxSizeMB}MB limit`, code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    let documentUrl: string;

    if (process.env.S3_BUCKET_NAME) {
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
      const s3 = new S3Client({});
      const s3Key = `signed-documents/${id}-v${baa.documentVersion}-uploaded.pdf`;
      const buffer = Buffer.from(await file.arrayBuffer());

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: s3Key,
          Body: buffer,
          ContentType: "application/pdf",
          ServerSideEncryption: "aws:kms",
          Metadata: {
            baaId: id,
            uploadedBy: session.email,
            legalReviewedBy: legalReviewedBy.trim(),
            uploadedAt: now,
          },
        }),
      );
      documentUrl = s3Key;
    } else {
      const buffer = Buffer.from(await file.arrayBuffer());
      documentUrl = `data:application/pdf;base64,${buffer.toString("base64").slice(0, 100)}...`;
      logger.info("[dev] Upload stored as truncated data URL (no S3 configured)");
    }

    const updated = await updateBAA(id, {
      source: "uploaded",
      uploadedBy: session.email,
      uploadedAt: now,
      legalReviewedBy: legalReviewedBy.trim(),
      legalReviewedAt: now,
      signedDocumentUrl: documentUrl,
    });

    await addAuditLog({
      baaId: id,
      vendorId: baa.vendorId,
      action: "BAA uploaded (vendor-supplied paper)",
      performedBy: session.name ?? session.email,
      details: {
        source: "uploaded",
        legalReviewedBy: legalReviewedBy.trim(),
        fileName: file.name,
        fileSizeBytes: file.size,
      },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    logger.info("Vendor-supplied BAA uploaded", {
      baaId: id,
      uploadedBy: session.email,
      legalReviewedBy: legalReviewedBy.trim(),
    });

    return NextResponse.json({ baa: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const statusCode =
      "statusCode" in (error as Record<string, unknown>)
        ? (error as { statusCode: number }).statusCode
        : 500;

    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json(
        { error: message, code: statusCode === 401 ? "UNAUTHORIZED" : "FORBIDDEN" },
        { status: statusCode },
      );
    }

    logger.error("PUT /api/baas/[id]/upload failed", { error: message });
    return NextResponse.json(
      { error: "Failed to upload BAA", code: "UPLOAD_ERROR" },
      { status: 500 },
    );
  }
}
