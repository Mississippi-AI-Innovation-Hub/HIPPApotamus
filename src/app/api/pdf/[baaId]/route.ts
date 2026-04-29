import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getRequiredSession } from "@/lib/auth/session";
import { getBAAById, getVendorById, getClinic, addAuditLog } from "@/lib/db";
import {
  generateContractPDF,
  generateAuditPacket,
  fetchSignedPdfFromS3,
} from "@/lib/pdf/generator";
import { uploadToS3, getPresignedUrl, getObjectFromS3 } from "@/lib/storage/s3";
import { logger } from "@/lib/logger";
import { kmsVerifyDocumentHash, isKmsConfigured } from "@/lib/signing/kms";

interface RouteContext {
  params: Promise<{ baaId: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await getRequiredSession();
    const { baaId } = await context.params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "pdf"; // "pdf" or "packet"
    const upload = searchParams.get("upload") === "true";
    // Source-of-truth: the server always prefers the stored signed PDF when
    // `baa.signedDocumentUrl` is set. The legacy `?stored=true` query param
    // is preserved for audit-log clarity but is no longer required by callers.
    // To explicitly bypass the stored copy and force regeneration from data,
    // pass `?regenerate=true` (used during draft / pre-signature previews).
    const forceRegenerate = searchParams.get("regenerate") === "true";

    const baa = await getBAAById(baaId);
    if (!baa) {
      return NextResponse.json(
        { error: "BAA not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const vendor = await getVendorById(baa.vendorId);
    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const clinicId =
      session.role === "admin" ? session.entityId : baa.clinicId;
    const clinic = await getClinic(clinicId);
    if (!clinic) {
      return NextResponse.json(
        { error: "Clinic not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    // ── Serve stored signed PDF whenever one exists ─────────────────────────
    // Signed documents are immutable — serve the exact stored copy with integrity check.
    // The route is the single source of truth: any caller (BAA modal, audit-packets
    // preview, future surfaces) automatically gets the signed copy without needing
    // a query flag. Callers can opt out with `?regenerate=true` for draft previews.
    if (!forceRegenerate && baa.signedDocumentUrl) {
      logger.info("Attempting to serve stored signed PDF", { baaId, key: baa.signedDocumentUrl, hash: baa.signedDocumentHash });
      try {
        const storedPdf = await getObjectFromS3(baa.signedDocumentUrl);
        if (storedPdf) {
          // ── SHA-256 Integrity Verification ──────────────────────────────
          // Re-compute the hash and compare against the stored hash.
          // If they don't match, the document has been tampered with.
          let kmsVerified: boolean | null | string = "not-checked";
          if (baa.signedDocumentHash) {
            const computedHash = crypto.createHash("sha256").update(Buffer.from(storedPdf)).digest("hex");
            if (computedHash !== baa.signedDocumentHash) {
              logger.error("SECURITY ALERT: Document integrity check FAILED — possible tampering", {
                baaId,
                expectedHash: baa.signedDocumentHash,
                computedHash,
                key: baa.signedDocumentUrl,
              });

              await addAuditLog({
                baaId,
                vendorId: baa.vendorId,
                action: "INTEGRITY_CHECK_FAILED",
                performedBy: session.name ?? session.email,
                details: {
                  message: "Document hash mismatch — possible tampering",
                  expectedHash: baa.signedDocumentHash,
                  computedHash,
                },
                ipAddress: request.headers.get("x-forwarded-for"),
              });

              return NextResponse.json(
                {
                  error: "Security Alert: Document integrity verification failed. The stored document may have been tampered with. This incident has been logged.",
                  code: "INTEGRITY_CHECK_FAILED",
                },
                { status: 409 },
              );
            }

            // KMS digital signature verification (if available)
            if (baa.kmsSignature && baa.kmsKeyArn) {
              const kmsResult = await kmsVerifyDocumentHash(computedHash, baa.kmsSignature, baa.kmsKeyArn);
              kmsVerified = kmsResult;
              if (kmsResult === false) {
                logger.error("SECURITY ALERT: KMS signature verification FAILED", {
                  baaId,
                  keyArn: baa.kmsKeyArn,
                });

                await addAuditLog({
                  baaId,
                  vendorId: baa.vendorId,
                  action: "KMS_VERIFICATION_FAILED",
                  performedBy: session.name ?? session.email,
                  details: {
                    message: "KMS digital signature verification failed — document may have been tampered with",
                    keyArn: baa.kmsKeyArn,
                  },
                  ipAddress: request.headers.get("x-forwarded-for"),
                });

                return NextResponse.json(
                  {
                    error: "Security Alert: KMS digital signature verification failed. This incident has been logged.",
                    code: "KMS_VERIFICATION_FAILED",
                  },
                  { status: 409 },
                );
              }
              logger.info("KMS signature verification passed", { baaId, keyArn: baa.kmsKeyArn });
            }

            logger.info("Document integrity check passed", { baaId, kmsVerified });
          }

          await addAuditLog({
            baaId,
            vendorId: baa.vendorId,
            action: "DOCUMENT_VIEWED",
            performedBy: session.name ?? session.email,
            details: {
              source: "s3_stored",
              key: baa.signedDocumentUrl,
              integrityVerified: !!baa.signedDocumentHash,
              kmsVerified: baa.kmsSignature ? kmsVerified : "no-signature",
            },
            ipAddress: request.headers.get("x-forwarded-for"),
          });

          return new NextResponse(new Uint8Array(storedPdf), {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `inline; filename="BAA_${baaId}_signed.pdf"`,
              "X-Document-Hash": baa.signedDocumentHash ?? "not-available",
              "X-Integrity-Verified": baa.signedDocumentHash ? "true" : "no-hash-stored",
              "X-KMS-Verified": String(kmsVerified),
            },
          });
        }
      } catch (s3Error) {
        logger.warn("Failed to fetch stored PDF from S3, falling back to regeneration", {
          baaId,
          key: baa.signedDocumentUrl,
          error: s3Error instanceof Error ? s3Error.message : String(s3Error),
        });
        // Fall through to regeneration below
      }
    }

    // If we get here for a signed BAA, the S3 fetch fell through — log loudly.
    if (baa.signedDate && baa.signedDocumentUrl && !forceRegenerate) {
      logger.warn("FALLBACK: Regenerating PDF for a SIGNED BAA — S3 stored copy unavailable", {
        baaId,
        signedDocumentUrl: baa.signedDocumentUrl,
        signedDocumentHash: baa.signedDocumentHash,
      });
    }

    // Audit log
    await addAuditLog({
      baaId,
      vendorId: baa.vendorId,
      action:
        baa.signedDate && !forceRegenerate
          ? `PDF regenerated (S3 fallback)`
          : `PDF ${format} generated`,
      performedBy: session.name ?? session.email,
      details: {
        format,
        upload,
        forceRegenerate,
        signedDocumentUrl: baa.signedDocumentUrl,
      },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    if (format === "packet") {
      // Source-of-truth: if this BAA is signed, fetch the S3 stored signed PDF
      // (same binary the Preview endpoint serves) and pass it into the audit
      // packet so `02_BAA_Contract.pdf` matches what the user previewed.
      // The helper verifies SHA-256 and throws on tamper.
      let signedPdfBuffer: Buffer | undefined;
      try {
        signedPdfBuffer =
          (await fetchSignedPdfFromS3(baa)) ?? undefined;
      } catch (integrityErr) {
        if (
          integrityErr instanceof Error &&
          integrityErr.message === "INTEGRITY_CHECK_FAILED"
        ) {
          await addAuditLog({
            baaId,
            vendorId: baa.vendorId,
            action: "INTEGRITY_CHECK_FAILED",
            performedBy: session.name ?? session.email,
            details: {
              message:
                "Hash mismatch on stored signed PDF during audit packet build",
              context: "audit_packet",
              key: baa.signedDocumentUrl,
            },
            ipAddress: request.headers.get("x-forwarded-for"),
          });
          return NextResponse.json(
            {
              error:
                "Security Alert: Document integrity verification failed for audit packet. The stored signed PDF may have been tampered with. This incident has been logged.",
              code: "INTEGRITY_CHECK_FAILED",
            },
            { status: 409 },
          );
        }
        throw integrityErr;
      }

      const zipBuffer = await generateAuditPacket(
        baa,
        vendor,
        clinic,
        signedPdfBuffer,
      );

      if (upload) {
        const key = `baas/${baaId}/audit_packet_${Date.now()}.zip`;
        const url = await uploadToS3({
          key,
          body: zipBuffer,
          contentType: "application/zip",
          metadata: { baaId, vendorId: baa.vendorId },
        });
        const presignedUrl = await getPresignedUrl(key, 3600);
        return NextResponse.json({ url, presignedUrl });
      }

      return new NextResponse(new Uint8Array(zipBuffer), {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="BAA_${baaId}_audit_packet.zip"`,
        },
      });
    }

    // Default: single contract PDF
    const pdfBuffer = await generateContractPDF(baa, vendor, clinic);

    if (upload) {
      const key = `baas/${baaId}/contract_${Date.now()}.pdf`;
      const url = await uploadToS3({
        key,
        body: pdfBuffer,
        contentType: "application/pdf",
        metadata: { baaId, vendorId: baa.vendorId },
      });
      const presignedUrl = await getPresignedUrl(key, 3600);
      return NextResponse.json({ url, presignedUrl });
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="BAA_${baaId}_contract.pdf"`,
      },
    });
  } catch (error) {
    logger.error("GET /api/pdf/[baaId] failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        code: "PDF_GENERATION_ERROR",
      },
      { status: 500 },
    );
  }
}
