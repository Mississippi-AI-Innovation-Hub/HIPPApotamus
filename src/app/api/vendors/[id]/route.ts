import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import { getVendorById, updateVendor, deleteVendor, addAuditLog, getBAAsByVendor } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { VendorType, ContractType } from "@/types";

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
    const vendor = await getVendorById(id);

    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({ vendor });
  } catch (error) {
    logger.error("GET /api/vendors/[id] failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch vendor", code: "FETCH_VENDOR_ERROR" },
      { status: 500 },
    );
  }
}

interface UpdateVendorBody {
  name?: string;
  type?: VendorType;
  contractType?: ContractType;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  requiresSubcontractorCompliance?: boolean;
  requiresSoc2Report?: boolean;
  breachNotificationSLADays?: number;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await getRequiredSession();
    const { id } = await context.params;
    const body = (await request.json()) as UpdateVendorBody;

    const vendor = await updateVendor(id, body);

    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    // Audit log for vendor update
    const baas = await getBAAsByVendor(id);
    if (baas.length > 0) {
      await addAuditLog({
        baaId: baas[0]!.id,
        vendorId: id,
        action: "Vendor information updated",
        performedBy: session.id,
        details: { updatedFields: Object.keys(body).join(", ") },
        ipAddress: request.headers.get("x-forwarded-for"),
      });
    }

    return NextResponse.json({ vendor });
  } catch (error) {
    logger.error("PATCH /api/vendors/[id] failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to update vendor", code: "UPDATE_VENDOR_ERROR" },
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

    const vendor = await getVendorById(id);
    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const deleted = await deleteVendor(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Failed to delete vendor", code: "DELETE_FAILED" },
        { status: 500 },
      );
    }

    logger.info("Vendor deleted via API", {
      vendorId: id,
      deletedBy: session.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("DELETE /api/vendors/[id] failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to delete vendor", code: "DELETE_VENDOR_ERROR" },
      { status: 500 },
    );
  }
}
