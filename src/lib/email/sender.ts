import { SendEmailCommand } from "@aws-sdk/client-ses";
import { sesClient } from "./sesClient";
import { logger } from "@/lib/logger";

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

const FROM_ADDRESS =
  process.env.SES_FROM_EMAIL ?? process.env.SES_FROM_ADDRESS ?? "";
const hasSES = !!FROM_ADDRESS;

export async function sendEmail(params: SendEmailParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const { to, subject, html, text, replyTo } = params;
  const toAddresses = Array.isArray(to) ? to : [to];

  // If SES is not configured, log and skip
  if (!hasSES) {
    logger.info("SES not configured: Email would be sent", {
      to: toAddresses.join(", "),
      subject,
      textPreview: text.substring(0, 200),
    });
    return { success: true, messageId: `nosend-${Date.now()}` };
  }

  try {
    const command = new SendEmailCommand({
      Source: FROM_ADDRESS,
      Destination: {
        ToAddresses: toAddresses,
      },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: html, Charset: "UTF-8" },
          Text: { Data: text, Charset: "UTF-8" },
        },
      },
      ...(replyTo && { ReplyToAddresses: [replyTo] }),
    });

    const result = await sesClient.send(command);

    logger.info("Email sent successfully", {
      messageId: result.MessageId,
      to: toAddresses.join(", "),
      subject,
    });

    return { success: true, messageId: result.MessageId };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    logger.error("Failed to send email", {
      to: toAddresses.join(", "),
      subject,
      error: errorMessage,
    });
    return { success: false, error: errorMessage };
  }
}
