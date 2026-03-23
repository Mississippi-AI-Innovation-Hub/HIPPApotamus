import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import { getBAAById, getVendorById, getClinic, addAuditLog } from "@/lib/db";
import { generateContractPDF, generateAuditPacket } from "@/lib/pdf/generator";
import { uploadToS3, getPresignedUrl } from "@/lib/storage/s3";
import { logger } from "@/lib/logger";

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

    // Audit log
    await addAuditLog({
      baaId,
      vendorId: baa.vendorId,
      action: `PDF ${format} generated`,
      performedBy: session.id,
      details: { format, upload },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    if (format === "packet") {
      const zipBuffer = await generateAuditPacket(baa, vendor, clinic);

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
