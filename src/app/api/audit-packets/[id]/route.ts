import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import {
  getAuditPacketById,
  deleteAuditPacket as deletePacketRecord,
  addAuditLog,
} from "@/lib/db";
import { deleteFromS3 } from "@/lib/storage/s3";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
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
    return NextResponse.json({ packet });
  } catch (error) {
    logger.error("GET /api/audit-packets/[id] failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to load audit packet" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/audit-packets/[id]
 *
 * Removes the DynamoDB record + every S3 object associated with the packet.
 * Fails open on missing S3 objects (dev mode never uploaded anything).
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
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

    // Best-effort S3 cleanup — don't fail the delete if storage is missing.
    if (packet.s3KeyZip) {
      await deleteFromS3(packet.s3KeyZip).catch((err) => {
        logger.warn("Failed to delete packet ZIP from S3", {
          packetId: id,
          key: packet.s3KeyZip,
          error: String(err),
        });
      });
    }
    for (const doc of packet.documents) {
      if (doc.s3Key) {
        await deleteFromS3(doc.s3Key).catch((err) => {
          logger.warn("Failed to delete packet document from S3", {
            packetId: id,
            key: doc.s3Key,
            error: String(err),
          });
        });
      }
    }

    await deletePacketRecord(id);

    await addAuditLog({
      baaId: packet.baaIds[0] ?? "system",
      vendorId: "",
      action: "AUDIT_PACKET_DELETED",
      performedBy: session.name ?? session.email,
      details: { packetId: id, packetName: packet.name },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("DELETE /api/audit-packets/[id] failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to delete audit packet" },
      { status: 500 },
    );
  }
}
