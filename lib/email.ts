import { logger } from "@/lib/logger";

/**
 * Email abstraction. Without EMAIL_API_KEY we log the message and return the
 * payload so the development UI can surface password-reset links safely.
 */
export interface Mail { to: string; subject: string; body: string }

export async function sendMail(mail: Mail): Promise<{ delivered: boolean; devPreview?: string }> {
  if (!process.env.EMAIL_API_KEY) {
    logger.info(`email (dev mode) -> ${mail.to}: ${mail.subject}`);
    return { delivered: false, devPreview: mail.body };
  }
  // Wire Resend/SendGrid/SES here.
  return { delivered: true };
}
