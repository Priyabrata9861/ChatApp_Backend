import nodemailer from "nodemailer";
import { logger } from "../utils/logger.js";

const trimEnv = (value) => value?.trim();

const getEmailAuth = () => {
  const email = trimEnv(process.env.EMAIL);
  const rawPassword = process.env.APP_PASSWORD || "";
  const pass = rawPassword.replace(/\s+/g, "").trim();

  return { user: email, pass };
};

const getTransportOptions = () => {
  const auth = getEmailAuth();

  const missing = [];

  if (!auth.user) missing.push("EMAIL");
  if (!auth.pass) missing.push("APP_PASSWORD");

  if (missing.length > 0) {
    throw new Error(
      `Email service is not configured. Missing environment variable(s): ${missing.join(", ")}. ` +
        `Set EMAIL and APP_PASSWORD (a Gmail App Password, not your account password). ` +
        `If using a non-Gmail SMTP provider, also set SMTP_HOST, SMTP_PORT, and SMTP_SECURE.`,
    );
  }

  if (!process.env.SMTP_HOST) {
    return {
      service: "gmail",
      auth,
    };
  }

  const host = trimEnv(process.env.SMTP_HOST);
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE.toLowerCase() === "true"
    : port === 465;

  return {
    host,
    port,
    secure,
    auth,
  };
};

const createTransporter = () =>
  nodemailer.createTransport(getTransportOptions());

// Wrap nodemailer sends so a failure surfaces as much detail as possible
// (Gmail's `response`, SMTP `code`, `command`) — this is what makes the
// otherwise-generic "Unable to send OTP email" diagnosable from server logs.
const deliverMail = async (mailOptions) => {
  const transporter = createTransporter();

  try {
    return await transporter.sendMail(mailOptions);
  } catch (err) {
    const detail = {
      code: err?.code,
      command: err?.command,
      response: err?.response,
      message: err?.message,
    };

    const gmailResponse = /response\d*\s*:\s*"([^"]+)/i.exec(err?.response || "");
    if (gmailResponse) detail.gmailResponseDetail = gmailResponse[1];

    logger.error("Nodemailer sendMail failed", err);

    // Re-throw an error that includes the SMTP detail for the controller to log.
    const wrapped = new Error(`SMTP send failed: ${err?.message}`);
    Object.assign(wrapped, detail);
    throw wrapped;
  }
};

export const isEmailConfigured = () => {
  try {
    getTransportOptions();
    return true;
  } catch {
    return false;
  }
};

export const sendOTP = async (email, otp) => {
  const info = await deliverMail({
    from: trimEnv(process.env.EMAIL),
    to: email,
    subject: "ChatApp OTP",
    text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    html: `
      <h2>Your OTP is ${otp}</h2>
      <p>It expires in 5 minutes.</p>
    `,
  });

  logger.info(`OTP email queued for ${email}: ${info.messageId}`);

  return info;
};

export const sendTestEmail = async (email) => {
  const info = await deliverMail({
    from: trimEnv(process.env.EMAIL),
    to: email,
    subject: "ChatApp Test Email",
    text: "This is a test email from ChatApp. If you receive this, SMTP is configured correctly.",
    html: `
      <h2>ChatApp Test Email</h2>
      <p>If you receive this message, SMTP is configured correctly.</p>
    `,
  });

  logger.info(`Test email queued for ${email}: ${info.messageId}`);
  return info;
};
