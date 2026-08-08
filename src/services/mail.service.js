import nodemailer from "nodemailer";
import { lookup as dnsLookup } from "node:dns/promises";
import { logger } from "../utils/logger.js";

const trimEnv = (value) => value?.trim();

// Render's free tier has NO IPv6 egress. Gmail's SMTP host (smtp.gmail.com)
// resolves to an IPv6 address that is returned FIRST by the default resolver,
// causing `connect ENETUNREACH`. This lookup forces the connection to resolve
// ONLY IPv4 (A) records, which reliably works on Render.
const ipv4Lookup = async (hostname, options) => {
  const { all } = options || {};
  const records = await dnsLookup(hostname, { family: 4, all: true });

  if (all) {
    return { address: records, family: 4 };
  }

  // Prefer the first record; fall back to the whole list if empty.
  const [first] = records;
  return first
    ? { address: first.address, family: first.family }
    : { address: hostname, family: 4 };
};

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
    // Use the explicit Gmail host + a forced IPv4 lookup. Do NOT rely on the
    // `service: "gmail"` shortcut: it resolves smtp.gmail.com to an IPv6
    // address first, which fails on Render (no IPv6 egress) with ENETUNREACH.
    //
    // NOTE: Gmail often blocks SMTP connections from cloud hosting providers
    // (like Render) with a connection timeout. If you hit this, set SMTP_HOST,
    // SMTP_PORT, SMTP_USER, and SMTP_PASS to a free transactional email
    // service (e.g. Brevo/Sendinblue, 300 emails/day free) which allows cloud
    // host connections.
    return {
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      lookup: ipv4Lookup,
      auth,
    };
  }

  const host = trimEnv(process.env.SMTP_HOST);
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE.toLowerCase() === "true"
    : port === 465;

  // Allow separate SMTP_USER/SMTP_PASS (common for providers like Brevo where
  // the SMTP login differs from the sender email). Falls back to EMAIL/APP_PASSWORD.
  const smtpAuth = {
    user: trimEnv(process.env.SMTP_USER) || auth.user,
    pass: trimEnv(process.env.SMTP_PASS) || auth.pass,
  };

  return {
    host,
    port,
    secure,
    lookup: ipv4Lookup,
    auth: smtpAuth,
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
