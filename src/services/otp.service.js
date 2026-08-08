import { randomInt } from "node:crypto";
import { logger } from "../utils/logger.js";
import { sendOTP as sendEmail } from "./mail.service.js";

export const generateOTP = () => randomInt(100000, 1000000).toString();

const emailRequiredVars = ["EMAIL", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];

export const sendOTP = async (email, otp) => {
  // Use the real email service only when all SMTP vars are present. When they
  // are absent (e.g. local dev without SMTP), fall back to logging the OTP.
  if (emailRequiredVars.every((key) => Boolean(process.env[key]?.trim()))) {
    return sendEmail(email, otp);
  }

  const missing = emailRequiredVars.filter(
    (key) => !Boolean(process.env[key]?.trim()),
  );

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `Email service is not configured. Missing environment variable(s): ${missing.join(", ")}. ` +
        `Set EMAIL plus SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in the deployment environment.`,
    );
  }

  logger.warn(
    `[development] Email service not configured (missing: ${missing.join(", ")}). ` +
      `Printing OTP to console instead.`,
  );
  logger.info(`[development] OTP for ${email}: ${otp}`);
};
