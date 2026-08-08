import { randomInt } from "node:crypto";
import { logger } from "../utils/logger.js";
import { sendOTP as sendEmail } from "./mail.service.js";

export const generateOTP = () => randomInt(100000, 1000000).toString();

export const sendOTP = async (email, otp) => {
  if (process.env.EMAIL && process.env.APP_PASSWORD) {
    return sendEmail(email, otp);
  }

  const missing = [];
  if (!process.env.EMAIL) missing.push("EMAIL");
  if (!process.env.APP_PASSWORD) missing.push("APP_PASSWORD");

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `Email service is not configured. Missing environment variable(s): ${missing.join(", ")}. ` +
        `Set EMAIL and APP_PASSWORD (a Gmail App Password) in the deployment environment.`,
    );
  }

  logger.warn(
    `[development] Email service not configured (missing: ${missing.join(", ")}). ` +
      `Printing OTP to console instead.`,
  );
  logger.info(`[development] OTP for ${email}: ${otp}`);
};
