import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getRequiredSession } from "@/lib/auth/session";
import {
  getBAAById,
  getVendorById,
  getClinic,
  createAuditPacket,
  getAuditPackets,
  addAuditLog,
} from "@/lib/db";
import { generateAggregateAuditPacket } from "@/lib/pdf/generator";
import { uploadToS3 } from "@/lib/storage/s3";
import { logger } from "@/lib/logger";
import type {
  AuditPacket,
  AuditPacketDocument,
  BAA,
  Vendor,
} from "@/types";

const USE_S3 = !!process.env.S3_BUCKET_NAME;

/**
 * GET /api/audit-packets
 *
 * Lists audit packets for the authenticated clinic. Admin-only.
 */
export async function GET() {
  try {
    const session = await getRequiredSession();
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const packets = await getAuditPackets(session.entityId);
    return NextResponse.json({ packets });
  } catch (error) {
    logger.error("GET /api/audit-packets failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to list audit packets" },
      { status: 500 },
    );
  }
}

interface CreateBody {
  name?: string;
  baaIds?: string[];
  dateFrom?: string | null;
  dateTo?: string | null;
  options?: {
    includePDFs?: boolean;
    includeAuditTrail?: boolean;
    includeExecutiveSummary?: boolean;
  };
}

/**
 * POST /api/audit-packets
 *
 * Generates a new audit packet:
 *  - validates the selected BAAs belong to the admin's clinic
 *  - generates the aggregate PDFs + per-BAA contract + compliance matrix
 *  - in production uploads every PDF and the full ZIP to S3
 *  - persists an AuditPacket record with the S3 keys so the UI can list
 *    previously generated packets and download any individual document
 *    without re-generating
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getRequiredSession();
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as CreateBody;
    if (!body.baaIds || body.baaIds.length === 0) {
      return NextResponse.json(
        { error: "baaIds must include at least one BAA" },
        { status: 400 },
      );
    }

    const clinicId = session.entityId;
    const clinic = await getClinic(clinicId);
    if (!clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
    }

    // Load selected BAAs + their vendors. Skip unknown IDs with a warning
    // but fail the whole request if none are valid.
    const baas: BAA[] = [];
    const vendorsById: Record<string, Vendor> = {};
    for (const baaId of body.baaIds) {
      const baa = await getBAAById(baaId);
      if (!baa) {
        logger.warn("AuditPacket: skipping unknown BAA", { baaId });
        continue;
      }
      if (baa.clinicId !== clinicId) {
        logger.warn("AuditPacket: skipping cross-clinic BAA", { baaId });
        continue;
      }
      baas.push(baa);
      if (!vendorsById[baa.vendorId]) {
        const vendor = await getVendorById(baa.vendorId);
        if (vendor) vendorsById[baa.vendorId] = vendor;
      }
    }

    if (baas.length === 0) {
      return NextResponse.json(
        { error: "None of the selected BAAs could be loaded" },
        { status: 400 },
      );
    }

    const now = new Date();
    const generatedAt = now.toISOString();
    const packetId = crypto.randomUUID();
    const packetName =
      body.name?.trim() ||
      `Compliance Report — ${now.toLocaleString("en-US", { month: "long", year: "numeric" })}`;
    const options = {
      includePDFs: body.options?.includePDFs ?? true,
      includeAuditTrail: body.options?.includeAuditTrail ?? true,
      includeExecutiveSummary: body.options?.includeExecutiveSummary ?? true,
    };

    // Generate all the PDFs + the ZIP in one pass so we don't double-
    // render anything.
    const result = await generateAggregateAuditPacket({
      packetName,
      baas,
      vendorsById,
      clinic,
      options,
      dateFrom: body.dateFrom ?? null,
      dateTo: body.dateTo ?? null,
      generatedAt,
    });

    // Upload artifacts. In dev without S3 we skip uploads but still save
    // the metadata so the history UI has something to render; downloads
    // in that case will regenerate on demand from the stored baaIds.
    const documents: AuditPacketDocument[] = [];
    let zipKey: string | null = null;
    let totalBytes = 0;

    if (USE_S3) {
      for (const part of result.parts) {
        const suffix =
          part.type === "executive_summary"
            ? "executive_summary.pdf"
            : part.type === "audit_trail"
              ? "audit_trail.pdf"
              : part.type === "contract"
                ? `contracts/${part.baaId}.pdf`
                : `matrices/${part.baaId}.pdf`;
        const key = `audit-packets/${packetId}/${suffix}`;
        await uploadToS3({
          key,
          body: part.buffer,
          contentType: "application/pdf",
          metadata: { packetId, docType: part.type, baaId: part.baaId ?? "" },
        });
        totalBytes += part.buffer.length;
        documents.push({
          type: part.type,
          name: part.name,
          s3Key: key,
          sizeBytes: part.buffer.length,
          baaId: part.baaId,
          vendorName: part.vendorName,
        });
      }

      zipKey = `audit-packets/${packetId}/packet.zip`;
      await uploadToS3({
        key: zipKey,
        body: result.zipBuffer,
        contentType: "application/zip",
        metadata: { packetId, clinicId },
      });
    } else {
      // Dev mode — record the metadata but don't persist the bytes. The
      // download endpoint will regenerate on demand.
      for (const part of result.parts) {
        totalBytes += part.buffer.length;
        documents.push({
          type: part.type,
          name: part.name,
          s3Key: null,
          sizeBytes: part.buffer.length,
          baaId: part.baaId,
          vendorName: part.vendorName,
        });
      }
    }

    const packet: AuditPacket = {
      id: packetId,
      clinicId,
      name: packetName,
      generatedAt,
      generatedBy: session.name ?? session.email,
      baaIds: baas.map((b) => b.id),
      dateFrom: body.dateFrom ?? null,
      dateTo: body.dateTo ?? null,
      options,
      s3KeyZip: zipKey,
      documents,
      totalSizeBytes: totalBytes,
      status: "complete",
      errorMessage: null,
    };

    await createAuditPacket(packet);

    await addAuditLog({
      baaId: baas[0].id,
      vendorId: baas[0].vendorId,
      action: "AUDIT_PACKET_GENERATED",
      performedBy: session.name ?? session.email,
      details: {
        packetId,
        packetName,
        baaCount: baas.length,
        totalSizeBytes: totalBytes,
        includesExecutiveSummary: options.includeExecutiveSummary,
        includesAuditTrail: options.includeAuditTrail,
        includesPDFs: options.includePDFs,
      },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    return NextResponse.json({ packet });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("POST /api/audit-packets failed", { error: message });
    return NextResponse.json(
      { error: "Failed to generate audit packet" },
      { status: 500 },
    );
  }
}
