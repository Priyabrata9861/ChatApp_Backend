import { randomInt } from "node:crypto";
import { sendOTP as sendEmail } from "./mail.service.js";

export const generateOTP = () => randomInt(100000, 1000000).toString();

export const sendOTP = async (email, otp) => {
  if (process.env.EMAIL && process.env.APP_PASSWORD) {
    return sendEmail(email, otp);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Email service is not configured");
  }

  console.info(`[development] OTP for ${email}: ${otp}`);
};
