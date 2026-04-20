import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/sender";
import {
  baaInvitationEmail,
  reminderEmail,
  signedConfirmationEmail,
  adminNotificationEmail,
  pendingSignatureReminderEmail,
  pendingCounterSignReminderEmail,
} from "@/lib/email/templates";
import { addAuditLog } from "@/lib/db";
import { logger } from "@/lib/logger";

type EmailType =
  | "invitation"
  | "reminder"
  | "signed_confirmation"
  | "admin_notification"
  | "pending_signature_reminder"
  | "pending_countersign_reminder";

interface SendEmailBody {
  type: EmailType;
  to: string;
  params: Record<string, string | number>;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getRequiredSession();
    const body = (await request.json()) as SendEmailBody;

    if (!body.type || !body.to || !body.params) {
      return NextResponse.json(
        { error: "Missing required fields: type, to, params", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    let emailContent: { subject: string; html: string; text: string };

    switch (body.type) {
      case "invitation":
        emailContent = baaInvitationEmail({
          vendorName: String(body.params["vendorName"] ?? ""),
          contactName: String(body.params["contactName"] ?? ""),
          clinicName: String(body.params["clinicName"] ?? ""),
          baaId: String(body.params["baaId"] ?? ""),
          signingUrl: String(body.params["signingUrl"] ?? ""),
          expirationDate: String(body.params["expirationDate"] ?? ""),
        });
        break;

      case "reminder":
        emailContent = reminderEmail({
          vendorName: String(body.params["vendorName"] ?? ""),
          contactName: String(body.params["contactName"] ?? ""),
          clinicName: String(body.params["clinicName"] ?? ""),
          baaId: String(body.params["baaId"] ?? ""),
          daysUntilExpiration: Number(body.params["daysUntilExpiration"] ?? 0),
          renewalUrl: String(body.params["renewalUrl"] ?? ""),
        });
        break;

      case "signed_confirmation":
        emailContent = signedConfirmationEmail({
          vendorName: String(body.params["vendorName"] ?? ""),
          contactName: String(body.params["contactName"] ?? ""),
          clinicName: String(body.params["clinicName"] ?? ""),
          baaId: String(body.params["baaId"] ?? ""),
          signedDate: String(body.params["signedDate"] ?? ""),
          documentUrl: String(body.params["documentUrl"] ?? ""),
        });
        break;

      case "admin_notification":
        emailContent = adminNotificationEmail({
          vendorName: String(body.params["vendorName"] ?? ""),
          clinicName: String(body.params["clinicName"] ?? ""),
          baaId: String(body.params["baaId"] ?? ""),
          action: String(body.params["action"] ?? ""),
          performedBy: String(body.params["performedBy"] ?? ""),
          timestamp: String(body.params["timestamp"] ?? ""),
        });
        break;

      case "pending_signature_reminder":
        emailContent = pendingSignatureReminderEmail({
          vendorName: String(body.params["vendorName"] ?? ""),
          contactName: String(body.params["contactName"] ?? ""),
          clinicName: String(body.params["clinicName"] ?? ""),
          baaId: String(body.params["baaId"] ?? ""),
          daysSinceInvitation: Number(body.params["daysSinceInvitation"] ?? 0),
          signingUrl: String(body.params["signingUrl"] ?? ""),
        });
        break;

      case "pending_countersign_reminder":
        emailContent = pendingCounterSignReminderEmail({
          hipaaOfficerName: String(body.params["hipaaOfficerName"] ?? ""),
          vendorName: String(body.params["vendorName"] ?? ""),
          clinicName: String(body.params["clinicName"] ?? ""),
          baaId: String(body.params["baaId"] ?? ""),
          daysSinceVendorSigned: Number(body.params["daysSinceVendorSigned"] ?? 0),
          vendorSignerName: String(body.params["vendorSignerName"] ?? ""),
          dashboardUrl: String(body.params["dashboardUrl"] ?? ""),
        });
        break;

      default: {
        return NextResponse.json(
          { error: `Unknown email type: ${body.type as string}`, code: "INVALID_TYPE" },
          { status: 400 },
        );
      }
    }

    const result = await sendEmail({
      to: body.to,
      ...emailContent,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Failed to send email", code: "SEND_FAILED" },
        { status: 500 },
      );
    }

    // Audit log for successful email send
    await addAuditLog({
      baaId: String(body.params["baaId"] ?? "system"),
      vendorId: String(body.params["vendorId"] ?? ""),
      action: `${body.type} email sent`,
      performedBy: session.name ?? session.email,
      details: {
        emailType: body.type,
        to: body.to,
        subject: emailContent.subject,
      },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    logger.error("POST /api/send-email failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to send email", code: "SEND_EMAIL_ERROR" },
      { status: 500 },
    );
  }
}
