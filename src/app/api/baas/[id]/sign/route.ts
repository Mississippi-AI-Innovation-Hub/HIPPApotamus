import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import { getBAAById, signBAA, addAuditLog, getVendorById, getClinic } from "@/lib/db";
import { sendEmail } from "@/lib/email/sender";
import { signedConfirmationEmail, adminNotificationEmail } from "@/lib/email/templates";
import { uploadToS3 } from "@/lib/storage/s3";
import { generateContractPDF } from "@/lib/pdf/generator";
import { logger } from "@/lib/logger";
import type { SigningCertificate, SignedSnapshot } from "@/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    // Parse request body for signer info
    let body: { signature?: string; vendorId?: string; signerName?: string } = {};
    try {
      body = await request.json();
    } catch {
      // No body is fine for authenticated admin signing
    }

    // Try to get session — but signing page is public, so session may not exist
    let sessionName = "Unknown Signer";
    let sessionId = "anonymous";
    try {
      const session = await getRequiredSession();
      sessionName = session.name;
      sessionId = session.id;
    } catch {
      // Public vendor signing — no session required
    }

    const existing = await getBAAById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "BAA not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    if (existing.status === "active" && existing.signedDate) {
      return NextResponse.json(
        { error: "BAA is already signed", code: "ALREADY_SIGNED" },
        { status: 409 },
      );
    }

    // Determine who is signing: use vendor contact name if signing from public page
    const vendor = await getVendorById(existing.vendorId);
    const signerName = body.signerName ?? vendor?.contactName ?? sessionName;

    // Fetch clinic data for PDF generation and snapshot
    const clinic = await getClinic(existing.clinicId);

    // ── Build signing metadata ───────────────────────────────────────────────
    const signingCertificate: SigningCertificate = {
      signerName,
      signerEmail: vendor?.contactEmail ?? "",
      ipAddress: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? null,
      userAgent: request.headers.get("user-agent") ?? null,
      timestamp: new Date().toISOString(),
      consentGrantedAt: new Date().toISOString(),
      method: body.signature ? "drawn_signature" : "click_to_accept",
    };

    const signedSnapshot: SignedSnapshot | null = vendor && clinic ? {
      vendorName: vendor.name,
      vendorAddress: vendor.address,
      vendorContactName: vendor.contactName,
      vendorContactEmail: vendor.contactEmail,
      clinicName: clinic.name,
      clinicAddress: clinic.address,
      effectiveDate: existing.effectiveDate,
      expirationDate: existing.expirationDate,
      contractType: existing.contractType,
      templateVersion: existing.templateVersion,
      termYears: existing.termYears,
    } : null;

    // ── Persist the signing FIRST so BAA has signedDate/signedBy ────────────
    const baa = await signBAA(id, signerName, {
      signedDocumentUrl: null, // will update after PDF generation
      signingCertificate,
      signedSnapshot,
    });

    if (!baa) {
      return NextResponse.json(
        { error: "Failed to sign BAA", code: "SIGN_FAILED" },
        { status: 500 },
      );
    }

    // ── Now generate + store the signed PDF (BAA now has signedDate/signedBy) ──
    let signedDocumentUrl: string | null = null;

    try {
      // 1. Upload the signature image if provided
      if (body.signature) {
        const sigBase64 = body.signature.replace(/^data:image\/\w+;base64,/, "");
        const sigBuffer = Buffer.from(sigBase64, "base64");
        await uploadToS3({
          key: `signatures/${id}.png`,
          body: sigBuffer,
          contentType: "image/png",
          metadata: { baaId: id, signerName },
        });
        logger.info("Signature image uploaded", { baaId: id });
      }

      // 2. Generate the signed PDF using the UPDATED baa (with signedDate/signedBy)
      if (vendor && clinic) {
        const pdfBuffer = await generateContractPDF(baa, vendor, clinic);
        const documentVersion = baa.documentVersion ?? 1;
        const pdfKey = `signed-documents/${id}-v${documentVersion}.pdf`;
        await uploadToS3({
          key: pdfKey,
          body: pdfBuffer,
          contentType: "application/pdf",
          metadata: { baaId: id, vendorId: baa.vendorId, version: String(documentVersion) },
        });
        signedDocumentUrl = pdfKey;
        logger.info("Signed PDF uploaded to S3", { baaId: id, key: pdfKey });

        // Update the BAA with the S3 key
        const { updateBAA } = await import("@/lib/db");
        await updateBAA(id, { signedDocumentUrl: pdfKey });
      }
    } catch (pdfError) {
      logger.warn("Failed to generate/upload signed PDF — signing succeeded but PDF not stored", {
        baaId: id,
        error: pdfError instanceof Error ? pdfError.message : String(pdfError),
      });
    }

    // Audit log
    await addAuditLog({
      baaId: id,
      vendorId: baa.vendorId,
      action: "BAA signed",
      performedBy: signerName,
      details: {
        signedBy: signerName,
        signedDate: baa.signedDate ?? "",
        signedDocumentUrl: signedDocumentUrl ?? "",
        signingMethod: signingCertificate.method,
      },
      ipAddress: request.headers.get("x-forwarded-for"),
    });
    if (vendor) {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

      const confirmationContent = signedConfirmationEmail({
        vendorName: vendor.name,
        contactName: vendor.contactName,
        clinicName: "Central Mississippi Health District",
        baaId: id,
        signedDate: baa.signedDate ?? new Date().toISOString(),
        documentUrl: baa.documentUrl ?? `${baseUrl}/baas/${id}`,
      });

      await sendEmail({
        to: vendor.contactEmail,
        ...confirmationContent,
      });

      // Notify admin
      const adminContent = adminNotificationEmail({
        vendorName: vendor.name,
        clinicName: "Central Mississippi Health District",
        baaId: id,
        action: "BAA Signed",
        performedBy: signerName,
        timestamp: new Date().toISOString(),
      });

      const adminEmail =
        process.env.ADMIN_EMAIL ?? "admin@msdoh.ms.gov";
      await sendEmail({
        to: adminEmail,
        ...adminContent,
      });
    }

    return NextResponse.json({ baa });
  } catch (error) {
    logger.error("POST /api/baas/[id]/sign failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to sign BAA", code: "SIGN_BAA_ERROR" },
      { status: 500 },
    );
  }
}
