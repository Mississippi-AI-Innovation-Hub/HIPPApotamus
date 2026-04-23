import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import {
  getAuditPacketById,
  getBAAById,
  getVendorById,
  getClinic,
  addAuditLog,
} from "@/lib/db";
import { generateAggregateAuditPacket } from "@/lib/pdf/generator";
import { getObjectFromS3 } from "@/lib/storage/s3";
import { logger } from "@/lib/logger";
import type {
  AuditPacketDocumentType,
  BAA,
  Vendor,
} from "@/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/audit-packets/[id]/download?doc=<type>[&baaId=<id>]
 *
 * doc=zip                 → full ZIP bundle
 * doc=executive_summary   → aggregate exec summary
 * doc=audit_trail         → aggregate audit trail
 * doc=contract&baaId=X    → one BAA's contract PDF
 * doc=compliance_matrix&baaId=X → one BAA's compliance matrix
 *
 * Serves the pre-generated S3 artifact when available; falls back to
 * regenerating from the packet's stored baaIds + options in dev (or when
 * S3 delete has cleaned something up but the metadata still exists).
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getRequiredSession();
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await context.params;
    const packet = await getAuditPacketById(id);
    if (!packet) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (packet.clinicId !== session.entityId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const doc = searchParams.get("doc") ?? "zip";
    const baaId = searchParams.get("baaId");

    // ── Try S3 first for specific docs ──────────────────────────────────
    let contentType: "application/pdf" | "application/zip" = "application/pdf";
    let filename = "audit_packet.pdf";
    let keyToFetch: string | null = null;

    if (doc === "zip") {
      contentType = "application/zip";
      filename = `${packet.name.replace(/[^\w\-]+/g, "_")}.zip`;
      keyToFetch = packet.s3KeyZip;
    } else {
      const matching = packet.documents.find((d) => {
        if (d.type !== (doc as AuditPacketDocumentType)) return false;
        if (d.baaId && baaId && d.baaId !== baaId) return false;
        if (baaId && d.baaId !== baaId) return false;
        return true;
      });
      if (!matching) {
        return NextResponse.json(
          { error: `Packet does not include a "${doc}" document` },
          { status: 404 },
        );
      }
      filename = `${matching.name.replace(/[^\w\-]+/g, "_")}.pdf`;
      keyToFetch = matching.s3Key;
    }

    if (keyToFetch) {
      const buffer = await getObjectFromS3(keyToFetch);
      if (buffer) {
        await addAuditLog({
          baaId: packet.baaIds[0] ?? "system",
          vendorId: "",
          action: "AUDIT_PACKET_DOC_DOWNLOADED",
          performedBy: session.name ?? session.email,
          details: { packetId: id, doc, baaId: baaId ?? "", source: "s3" },
          ipAddress: request.headers.get("x-forwarded-for"),
        });
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      }
      logger.warn("AuditPacket S3 object missing, falling back to regen", {
        packetId: id,
        key: keyToFetch,
      });
    }

    // ── Fallback: regenerate from packet metadata ───────────────────────
    // Dev mode never uploaded anything, so we rebuild from the stored
    // baaIds + options. Slightly slower but always correct.
    const clinic = await getClinic(packet.clinicId);
    if (!clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
    }

    const baas: BAA[] = [];
    const vendorsById: Record<string, Vendor> = {};
    for (const bid of packet.baaIds) {
      const b = await getBAAById(bid);
      if (!b) continue;
      baas.push(b);
      if (!vendorsById[b.vendorId]) {
        const v = await getVendorById(b.vendorId);
        if (v) vendorsById[b.vendorId] = v;
      }
    }
    if (baas.length === 0) {
      return NextResponse.json(
        { error: "No source BAAs remaining for this packet" },
        { status: 410 },
      );
    }

    const result = await generateAggregateAuditPacket({
      packetName: packet.name,
      baas,
      vendorsById,
      clinic,
      options: packet.options,
      dateFrom: packet.dateFrom,
      dateTo: packet.dateTo,
      generatedAt: packet.generatedAt,
    });

    let body: Buffer;
    if (doc === "zip") {
      body = result.zipBuffer;
    } else {
      const match = result.parts.find((p) => {
        if (p.type !== (doc as AuditPacketDocumentType)) return false;
        if (baaId && p.baaId !== baaId) return false;
        return true;
      });
      if (!match) {
        return NextResponse.json(
          { error: `Regenerated packet did not include "${doc}"` },
          { status: 404 },
        );
      }
      body = match.buffer;
    }

    await addAuditLog({
      baaId: packet.baaIds[0] ?? "system",
      vendorId: "",
      action: "AUDIT_PACKET_DOC_DOWNLOADED",
      performedBy: session.name ?? session.email,
      details: { packetId: id, doc, baaId: baaId ?? "", source: "regen" },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error("GET /api/audit-packets/[id]/download failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to download audit packet" },
      { status: 500 },
    );
  }
}
