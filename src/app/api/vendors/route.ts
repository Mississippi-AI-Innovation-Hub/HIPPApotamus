import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import {
  getVendors,
  createVendor,
  createBAA,
  addAuditLog,
} from "@/lib/db";
import { sendEmail } from "@/lib/email/sender";
import { baaInvitationEmail } from "@/lib/email/templates";
import { logger } from "@/lib/logger";
import type { Vendor, BAA, ContractType, VendorType, BAAStatus } from "@/types";

export async function GET() {
  try {
    const session = await getRequiredSession();
    const clinicId =
      session.role === "admin" ? session.entityId : "clinic-001";
    const vendors = await getVendors(clinicId);
    return NextResponse.json({ vendors });
  } catch (error) {
    logger.error("GET /api/vendors failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch vendors", code: "FETCH_VENDORS_ERROR" },
      { status: 500 },
    );
  }
}

interface CreateVendorBody {
  name: string;
  type: VendorType;
  contractType: ContractType;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  requiresSubcontractorCompliance?: boolean;
  requiresSoc2Report?: boolean;
  breachNotificationSLADays?: number;
  effectiveDate?: string;
  expirationDate?: string;
  termYears?: 1 | 2;
  templateVersion?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getRequiredSession();
    const body = (await request.json()) as CreateVendorBody;

    // Validate required fields
    if (!body.name || !body.contactEmail || !body.contactName) {
      return NextResponse.json(
        { error: "Missing required fields: name, contactName, contactEmail", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const clinicId =
      session.role === "admin" ? session.entityId : "clinic-001";

    // Create vendor
    const vendor: Vendor = await createVendor(
      {
        name: body.name,
        type: body.type ?? "other",
        contractType: body.contractType ?? "other",
        contactName: body.contactName,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone ?? "",
        address: body.address ?? "",
        requiresSubcontractorCompliance:
          body.requiresSubcontractorCompliance ?? false,
        requiresSoc2Report: body.requiresSoc2Report ?? false,
        breachNotificationSLADays: body.breachNotificationSLADays ?? 60,
      },
      clinicId,
    );

    // Create initial BAA
    const now = new Date();
    const termYears = body.termYears ?? 2;
    const effectiveDate =
      body.effectiveDate ?? now.toISOString().split("T")[0]!;
    const expirationDate =
      body.expirationDate ??
      new Date(
        now.getFullYear() + termYears,
        now.getMonth(),
        now.getDate(),
      )
        .toISOString()
        .split("T")[0]!;

    const baa: BAA = await createBAA({
      vendorId: vendor.id,
      clinicId,
      contractType: vendor.contractType,
      status: "pending_signature" as BAAStatus,
      effectiveDate,
      expirationDate,
      signedDate: null,
      signedBy: null,
      documentUrl: null,
      signedDocumentUrl: null,
      signingCertificate: null,
      signedSnapshot: null,
      documentVersion: 1,
      parentBaaId: null,
      versionType: "original",
      templateVersion: body.templateVersion ?? "v1.0.0",
      termYears,
      requiresStateLawRetentionNotice:
        vendor.type === "medical_records_storage",
    });

    // Add audit log
    await addAuditLog({
      baaId: baa.id,
      vendorId: vendor.id,
      action: "BAA created and invitation sent",
      performedBy: session.name ?? session.email,
      details: {
        vendorName: vendor.name,
        contactEmail: vendor.contactEmail,
      },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    // Send invitation email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const emailContent = baaInvitationEmail({
      vendorName: vendor.name,
      contactName: vendor.contactName,
      clinicName: "Mississippi DOH Central Region",
      baaId: baa.id,
      signingUrl: `${baseUrl}/sign/${baa.id}`,
      expirationDate,
    });

    await sendEmail({
      to: vendor.contactEmail,
      ...emailContent,
    });

    return NextResponse.json({ vendor, baa }, { status: 201 });
  } catch (error) {
    logger.error("POST /api/vendors failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to create vendor", code: "CREATE_VENDOR_ERROR" },
      { status: 500 },
    );
  }
}
