interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

interface BAAInvitationParams {
  vendorName: string;
  contactName: string;
  clinicName: string;
  baaId: string;
  signingUrl: string;
  expirationDate: string;
}

interface ReminderParams {
  vendorName: string;
  contactName: string;
  clinicName: string;
  baaId: string;
  daysUntilExpiration: number;
  renewalUrl: string;
}

interface SignedConfirmationParams {
  vendorName: string;
  contactName: string;
  clinicName: string;
  baaId: string;
  signedDate: string;
  documentUrl: string;
}

interface AdminNotificationParams {
  vendorName: string;
  clinicName: string;
  baaId: string;
  action: string;
  performedBy: string;
  timestamp: string;
}

interface PendingSignatureReminderParams {
  vendorName: string;
  contactName: string;
  clinicName: string;
  baaId: string;
  daysSinceInvitation: number;
  signingUrl: string;
}

interface PendingCounterSignReminderParams {
  hipaaOfficerName: string;
  vendorName: string;
  clinicName: string;
  baaId: string;
  daysSinceVendorSigned: number;
  vendorSignerName: string;
  dashboardUrl: string;
}

export function baaInvitationEmail(
  params: BAAInvitationParams,
): EmailContent {
  const { vendorName, contactName, clinicName, baaId, signingUrl, expirationDate } =
    params;

  return {
    subject: `Action Required: BAA Signature Request from ${clinicName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0d9488, #059669); padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">HIPAApotamus</h1>
          <p style="color: #d1fae5; margin: 4px 0 0;">Business Associate Agreement</p>
        </div>
        <div style="padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Dear ${contactName},</p>
          <p><strong>${clinicName}</strong> has prepared a Business Associate Agreement (BAA) for <strong>${vendorName}</strong> and requires your signature.</p>
          <p><strong>BAA Reference:</strong> ${baaId}<br/>
          <strong>Expiration Date:</strong> ${expirationDate}</p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${signingUrl}" style="background: #0d9488; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">Review &amp; Sign BAA</a>
          </p>
          <p style="font-size: 13px; color: #64748b;">This agreement is required under HIPAA regulations (45 CFR Parts 160 and 164) to ensure the protection of Protected Health Information (PHI).</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">This is an automated message from HIPAApotamus BAA Management System. Do not reply to this email.</p>
        </div>
      </body>
      </html>
    `,
    text: `Dear ${contactName},

${clinicName} has prepared a Business Associate Agreement (BAA) for ${vendorName} and requires your signature.

BAA Reference: ${baaId}
Expiration Date: ${expirationDate}

Review and sign the BAA at: ${signingUrl}

This agreement is required under HIPAA regulations (45 CFR Parts 160 and 164) to ensure the protection of Protected Health Information (PHI).

---
This is an automated message from HIPAApotamus BAA Management System.`,
  };
}

export function reminderEmail(params: ReminderParams): EmailContent {
  const {
    vendorName,
    contactName,
    clinicName,
    baaId,
    daysUntilExpiration,
    renewalUrl,
  } = params;

  const urgency =
    daysUntilExpiration <= 30 ? "URGENT: " : "";

  return {
    subject: `${urgency}BAA Expiration Reminder - ${vendorName} (${daysUntilExpiration} days)`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto;">
        <div style="background: ${daysUntilExpiration <= 30 ? "#dc2626" : "#f59e0b"}; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">BAA Expiration Notice</h1>
          <p style="color: white; margin: 4px 0 0; opacity: 0.9;">${daysUntilExpiration} days remaining</p>
        </div>
        <div style="padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Dear ${contactName},</p>
          <p>The Business Associate Agreement between <strong>${clinicName}</strong> and <strong>${vendorName}</strong> will expire in <strong>${daysUntilExpiration} days</strong>.</p>
          <p><strong>BAA Reference:</strong> ${baaId}</p>
          <p>Please initiate the renewal process to ensure uninterrupted compliance with HIPAA requirements.</p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${renewalUrl}" style="background: #0d9488; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">Begin Renewal</a>
          </p>
          <p style="font-size: 13px; color: #64748b;">Failure to maintain a valid BAA may result in HIPAA violations and associated penalties.</p>
        </div>
      </body>
      </html>
    `,
    text: `Dear ${contactName},

The Business Associate Agreement between ${clinicName} and ${vendorName} will expire in ${daysUntilExpiration} days.

BAA Reference: ${baaId}

Please initiate the renewal process to ensure uninterrupted compliance with HIPAA requirements.

Begin renewal at: ${renewalUrl}

Failure to maintain a valid BAA may result in HIPAA violations and associated penalties.`,
  };
}

export function signedConfirmationEmail(
  params: SignedConfirmationParams,
): EmailContent {
  const { vendorName, contactName, clinicName, baaId, signedDate, documentUrl } =
    params;

  return {
    subject: `BAA Fully Executed - ${vendorName} & ${clinicName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto;">
        <div style="background: #059669; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">BAA Successfully Signed</h1>
        </div>
        <div style="padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Dear ${contactName},</p>
          <p>The Business Associate Agreement between <strong>${clinicName}</strong> and <strong>${vendorName}</strong> has been fully executed.</p>
          <p><strong>BAA Reference:</strong> ${baaId}<br/>
          <strong>Date Signed:</strong> ${signedDate}</p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${documentUrl}" style="background: #0d9488; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">Download Signed BAA</a>
          </p>
          <p style="font-size: 13px; color: #64748b;">Please retain a copy of this document for your records. Under HIPAA regulations, BAAs must be maintained for a minimum of six years from the date of creation or last effective date.</p>
        </div>
      </body>
      </html>
    `,
    text: `Dear ${contactName},

The Business Associate Agreement between ${clinicName} and ${vendorName} has been fully executed.

BAA Reference: ${baaId}
Date Signed: ${signedDate}

Download your signed BAA at: ${documentUrl}

Please retain a copy of this document for your records. Under HIPAA regulations, BAAs must be maintained for a minimum of six years from the date of creation or last effective date.`,
  };
}

export function pendingSignatureReminderEmail(
  params: PendingSignatureReminderParams,
): EmailContent {
  const { vendorName, contactName, clinicName, baaId, daysSinceInvitation, signingUrl } = params;
  const urgency = daysSinceInvitation >= 14 ? "URGENT: " : daysSinceInvitation >= 7 ? "Reminder: " : "";

  return {
    subject: `${urgency}BAA Awaiting Your Signature - ${clinicName} & ${vendorName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto;">
        <div style="background: ${daysSinceInvitation >= 14 ? "#dc2626" : daysSinceInvitation >= 7 ? "#ea580c" : "#0d9488"}; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Signature Reminder</h1>
          <p style="color: white; margin: 4px 0 0; opacity: 0.9;">${daysSinceInvitation} days since invitation</p>
        </div>
        <div style="padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Dear ${contactName},</p>
          <p>It has been <strong>${daysSinceInvitation} days</strong> since <strong>${clinicName}</strong> sent you a Business Associate Agreement for <strong>${vendorName}</strong>, and we have not yet received your signature.</p>
          <p><strong>BAA Reference:</strong> ${baaId}</p>
          <p>Please review and sign at your earliest convenience to avoid delays in our partnership.</p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${signingUrl}" style="background: #0d9488; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">Review &amp; Sign BAA</a>
          </p>
          <p style="font-size: 13px; color: #64748b;">A signed BAA is required before HIPAA-regulated information can be shared. If you have already signed and believe this is an error, please reply to this email.</p>
        </div>
      </body>
      </html>
    `,
    text: `Dear ${contactName},

It has been ${daysSinceInvitation} days since ${clinicName} sent you a Business Associate Agreement for ${vendorName}, and we have not yet received your signature.

BAA Reference: ${baaId}

Review and sign at: ${signingUrl}

A signed BAA is required before HIPAA-regulated information can be shared.`,
  };
}

export function pendingCounterSignReminderEmail(
  params: PendingCounterSignReminderParams,
): EmailContent {
  const {
    hipaaOfficerName,
    vendorName,
    clinicName,
    baaId,
    daysSinceVendorSigned,
    vendorSignerName,
    dashboardUrl,
  } = params;
  const urgency = daysSinceVendorSigned >= 7 ? "URGENT: " : daysSinceVendorSigned >= 3 ? "Action Required: " : "";

  return {
    subject: `${urgency}Counter-Sign BAA - ${vendorName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto;">
        <div style="background: ${daysSinceVendorSigned >= 7 ? "#dc2626" : "#d97706"}; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Counter-Signature Required</h1>
          <p style="color: white; margin: 4px 0 0; opacity: 0.9;">${daysSinceVendorSigned} day${daysSinceVendorSigned === 1 ? "" : "s"} awaiting your action</p>
        </div>
        <div style="padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Dear ${hipaaOfficerName},</p>
          <p><strong>${vendorSignerName}</strong> from <strong>${vendorName}</strong> signed the Business Associate Agreement <strong>${daysSinceVendorSigned} day${daysSinceVendorSigned === 1 ? "" : "s"} ago</strong>. The agreement is awaiting your counter-signature to be fully executed.</p>
          <p><strong>BAA Reference:</strong> ${baaId}<br/>
          <strong>Covered Entity:</strong> ${clinicName}</p>
          <p>Until counter-signed, the agreement is not legally binding and PHI cannot be shared with the vendor.</p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${dashboardUrl}" style="background: #d97706; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">Open Dashboard to Counter-Sign</a>
          </p>
          <p style="font-size: 13px; color: #64748b;">Counter-signature completes the bilateral signing ceremony required under 45 CFR §164.504(e).</p>
        </div>
      </body>
      </html>
    `,
    text: `Dear ${hipaaOfficerName},

${vendorSignerName} from ${vendorName} signed the BAA ${daysSinceVendorSigned} day(s) ago. The agreement is awaiting your counter-signature to be fully executed.

BAA Reference: ${baaId}
Covered Entity: ${clinicName}

Counter-sign at: ${dashboardUrl}

Until counter-signed, the agreement is not legally binding and PHI cannot be shared with the vendor.`,
  };
}

export function adminNotificationEmail(
  params: AdminNotificationParams,
): EmailContent {
  const { vendorName, clinicName, baaId, action, performedBy, timestamp } =
    params;

  return {
    subject: `[HIPAApotamus] BAA Activity: ${action} - ${vendorName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto;">
        <div style="background: #475569; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Admin Notification</h1>
        </div>
        <div style="padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Action</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${action}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Vendor</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${vendorName}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Clinic</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${clinicName}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">BAA ID</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${baaId}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Performed By</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${performedBy}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Timestamp</td><td style="padding: 8px;">${timestamp}</td></tr>
          </table>
        </div>
      </body>
      </html>
    `,
    text: `Admin Notification - BAA Activity

Action: ${action}
Vendor: ${vendorName}
Clinic: ${clinicName}
BAA ID: ${baaId}
Performed By: ${performedBy}
Timestamp: ${timestamp}`,
  };
}
