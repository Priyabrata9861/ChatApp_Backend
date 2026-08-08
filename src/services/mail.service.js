import nodemailer from "nodemailer";
import { logger } from "../utils/logger.js";

const trimEnv = (value) => value?.trim();

/**
 * Validate that all required SMTP configuration is present.
 *
 * Throws a descriptive error listing the missing variable names. It NEVER
 * prints the actual values (credentials are never logged).
 */
const assertConfigured = () => {
  const required = ["EMAIL", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
  const missing = required.filter((key) => !trimEnv(process.env[key]));

  if (missing.length > 0) {
    throw new Error(
      `Email service is not configured. Missing environment variable(s): ${missing.join(", ")}. ` +
        `Set these to your SMTP provider (e.g. Brevo) credentials in the deployment environment.`,
    );
  }
};

/**
 * Build the generic Nodemailer transport options from environment variables.
 *
 *   SMTP_HOST -> host
 *   SMTP_PORT -> port (default 587)
 *   SMTP_USER -> auth.user
 *   SMTP_PASS -> auth.pass
 *   EMAIL     -> sender "from" address (verified sender)
 *
 * `secure` is true only when the port is 465.
 */
const getTransportOptions = () => {
  assertConfigured();

  const port = Number(process.env.SMTP_PORT || 587);

  return {
    host: trimEnv(process.env.SMTP_HOST),
    port,
    secure: port === 465,
    auth: {
      user: trimEnv(process.env.SMTP_USER),
      pass: trimEnv(process.env.SMTP_PASS),
    },
    // Without explicit timeouts, the default is 2 minutes per socket phase.
    // Some cloud providers (and Brevo) can take a while to establish/upgrade
    // the connection, so give generous, explicit limits to avoid premature
    // "Connection timeout" failures on Render.
    connectionTimeout: 15000, // ms to establish the TCP connection
    greetingTimeout: 15000, // ms to receive the SMTP greeting
    socketTimeout: 30000, // ms of inactivity on a socket before timeout
    // Some SMTP providers (e.g. Brevo) prefer STARTTLS on 587. Nodemailer
    // negotiates TLS automatically; this option is harmless and helps certain
    // cloud networks.
    tls: {
      minVersion: "TLSv1.2",
    },
  };
};

/**
 * Create a reusable Nodemailer transporter. Creating it once (instead of on
 * every send) avoids re-validating config and re-establishing state per mail.
 */
let transporter;

const createTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport(getTransportOptions());

    // Log whether SMTP config is present WITHOUT exposing the actual values.
    // This helps confirm the deployment env vars are wired up (booleans only).
    logger.info(
      "SMTP configuration loaded. " +
        `SMTP_HOST configured: ${Boolean(trimEnv(process.env.SMTP_HOST))}. ` +
        `SMTP_PORT configured: ${Boolean(trimEnv(process.env.SMTP_PORT))}. ` +
        `SMTP_USER configured: ${Boolean(trimEnv(process.env.SMTP_USER))}. ` +
        `SMTP_PASS configured: ${Boolean(trimEnv(process.env.SMTP_PASS))}. ` +
        `EMAIL configured: ${Boolean(trimEnv(process.env.EMAIL))}.`,
    );
  }
  return transporter;
};

/**
 * Send a mail through the transporter, surfacing useful SMTP diagnostics
 * (code, command, response, message) in the server logs — while never
 * logging the SMTP password/key.
 */
const deliverMail = async (mailOptions) => {
  const emailTransporter = createTransporter();

  try {
    return await emailTransporter.sendMail(mailOptions);
  } catch (err) {
    const detail = {
      code: err?.code,
      command: err?.command,
      response: err?.response,
      message: err?.message,
    };

    logger.error("Nodemailer sendMail failed", err);

    // Re-throw an error that includes SMTP detail for the controller to log
    // (the controller returns a generic client message and never surfaces this).
    const wrapped = new Error(`SMTP send failed: ${err?.message}`);
    Object.assign(wrapped, detail);
    throw wrapped;
  }
};

export const isEmailConfigured = () => {
  try {
    assertConfigured();
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

  logger.info(`OTP email sent to ${email}: ${info.messageId}`);

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

  logger.info(`Test email sent to ${email}: ${info.messageId}`);
  return info;
};

