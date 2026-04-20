import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getRequiredSession } from "@/lib/auth/session";
import { getBAAById, getVendorById, getClinic, updateBAA, addAuditLog } from "@/lib/db";
import { uploadToS3 } from "@/lib/storage/s3";
import { generateContractPDF } from "@/lib/pdf/generator";
import { logger } from "@/lib/logger";
import { kmsSignDocumentHash } from "@/lib/signing/kms";
import type { SigningCertificate } from "@/types";

/**
 * POST /api/baas/[id]/countersign
 * Counter-signs a BAA on behalf of the covered entity (clinic).
 * Requires admin session + full signing ceremony (signature, consent, metadata).
 * Changes status from pending_countersignature → active.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getRequiredSession();
    const { id } = await context.params;

    const body = (await request.json()) as {
      signature?: string; // base64 drawn signature
      counterSignerName?: string;
      counterSignerTitle?: string;
      agreedToTerms?: boolean;
    };

    // Validate required fields
    if (!body.signature) {
      return NextResponse.json({ error: "Signature is required" }, { status: 400 });
    }
    if (!body.counterSignerName?.trim()) {
      return NextResponse.json({ error: "Signer name is required" }, { status: 400 });
    }
    if (!body.counterSignerTitle?.trim()) {
      return NextResponse.json({ error: "Signer title is required" }, { status: 400 });
    }
    if (!body.agreedToTerms) {
      return NextResponse.json({ error: "You must agree to the terms" }, { status: 400 });
    }

    const baa = await getBAAById(id);
    if (!baa) {
      return NextResponse.json({ error: "BAA not found" }, { status: 404 });
    }

    if (baa.status !== "pending_countersignature") {
      return NextResponse.json(
        { error: `Cannot counter-sign a BAA with status "${baa.status}".` },
        { status: 400 },
      );
    }

    const counterSignerName = body.counterSignerName.trim();
    const counterSignerTitle = body.counterSignerTitle.trim();
    const now = new Date().toISOString();
    const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? null;

    // Upload counter-signature image to S3
    try {
      const sigBase64 = body.signature.replace(/^data:image\/\w+;base64,/, "");
      const sigBuffer = Buffer.from(sigBase64, "base64");
      await uploadToS3({
        key: `signatures/${id}-countersign.png`,
        body: sigBuffer,
        contentType: "image/png",
        metadata: { baaId: id, signerName: counterSignerName, type: "countersignature" },
      });
    } catch (uploadErr) {
      logger.warn("Failed to upload counter-signature image", { baaId: id, error: String(uploadErr) });
    }

    // Regenerate the PDF with BOTH signatures embedded
    const vendor = await getVendorById(baa.vendorId);
    const clinic = await getClinic(baa.clinicId);
    let signedDocumentHash: string | null = null;

    if (vendor && clinic) {
      try {
        // Pass both signatures to the PDF generator
        const pdfBuffer = await generateContractPDF(
          { ...baa, counterSignedBy: counterSignerName, counterSignerTitle, counterSignedDate: now, status: "active" },
          vendor,
          clinic,
          undefined, // vendor signature already embedded from first signing
          body.signature, // counter-signature
        );

        signedDocumentHash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

        // KMS digital signature for the fully executed document
        let kmsSignature: string | null = null;
        let kmsKeyArn: string | null = null;
        try {
          const kmsResult = await kmsSignDocumentHash(signedDocumentHash);
          if (kmsResult) {
            kmsSignature = kmsResult.signature;
            kmsKeyArn = kmsResult.keyArn;
            logger.info("KMS digital signature applied to counter-signed document", { baaId: id, keyArn: kmsKeyArn });
          }
        } catch (kmsErr) {
          logger.warn("KMS signing failed for counter-signed document", {
            baaId: id,
            error: kmsErr instanceof Error ? kmsErr.message : String(kmsErr),
          });
        }

        const documentVersion = baa.documentVersion ?? 1;
        const pdfKey = `signed-documents/${id}-v${documentVersion}-countersigned.pdf`;
        await uploadToS3({
          key: pdfKey,
          body: pdfBuffer,
          contentType: "application/pdf",
          metadata: { baaId: id, vendorId: baa.vendorId, version: String(documentVersion), sha256: signedDocumentHash },
        });

        await updateBAA(id, {
          signedDocumentUrl: pdfKey,
          signedDocumentHash,
          kmsSignature,
          kmsKeyArn,
        });

        logger.info("Counter-signed PDF uploaded", { baaId: id, key: pdfKey });
      } catch (pdfErr) {
        logger.warn("Failed to generate counter-signed PDF", { baaId: id, error: String(pdfErr) });
      }
    }

    // Update BAA to fully executed
    await updateBAA(id, {
      status: "active",
      counterSignedDate: now,
      counterSignedBy: counterSignerName,
      counterSignerTitle,
    });

    // Audit log
    await addAuditLog({
      baaId: id,
      vendorId: baa.vendorId,
      action: "COUNTER_SIGNATURE",
      performedBy: session.email ?? session.name ?? "admin",
      details: {
        counterSignerName,
        counterSignerTitle,
        method: "drawn_signature",
        consentGrantedAt: now,
        documentHash: signedDocumentHash,
        message: "BAA counter-signed by covered entity — contract is now fully executed",
      },
      ipAddress: ip,
    });

    logger.info("BAA counter-signed", { baaId: id, counterSignerName, status: "active" });

    return NextResponse.json({
      success: true,
      message: "BAA counter-signed successfully. The agreement is now fully executed.",
    });
  } catch (error) {
    logger.error("Counter-sign error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to counter-sign" },
      { status: 500 },
    );
  }
}
