import { logger } from "../utils/logger.js";

const trimEnv = (value) => value?.trim();

// Brevo's transactional email HTTP API (HTTPS/443). This is far more reliable
// than SMTP from Render's free tier, which BLOCKS outbound SMTP ports
// (25/465/587) — the TCP connection simply never establishes (`ETIMEDOUT`,
// `command: "CONN"`). HTTPS on port 443 is always allowed because the app
// already serves its own traffic over it.
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Validate that all required email configuration is present.
 *
 * Throws a descriptive error listing the missing variable names. It NEVER
 * prints the actual values (credentials are never logged).
 */
const assertConfigured = () => {
  const required = ["EMAIL", "BREVO_API_KEY"];
  const missing = required.filter((key) => !trimEnv(process.env[key]));

  if (missing.length > 0) {
    throw new Error(
      `Email service is not configured. Missing environment variable(s): ${missing.join(", ")}. ` +
        `Set the verified sender EMAIL and BREVO_API_KEY in the deployment environment.`,
    );
  }

  // Log only booleans — never the actual key/email value.
  logger.info(
    "Email configuration loaded. " +
      `EMAIL configured: ${Boolean(trimEnv(process.env.EMAIL))}. ` +
      `BREVO_API_KEY configured: ${Boolean(trimEnv(process.env.BREVO_API_KEY))}.`,
  );
};

/**
 * Send a transactional email through Brevo's HTTP API.
 *
 * Returns `{ messageId }` on success. Throws on failure, logging the HTTP
 * status and Brevo's error response (which never contains the API key).
 */
const sendViaBrevo = async ({ to, subject, text, html }) => {
  assertConfigured();

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "api-key": trimEnv(process.env.BREVO_API_KEY),
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: trimEnv(process.env.EMAIL), name: "ChatApp" },
      to: [{ email: to }],
      subject,
      htmlContent: html || text,
      textContent: text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    const err = new Error(
      `Brevo API error (${response.status}): ${body}`,
    );
    // Log without ever printing the API key.
    logger.error("Brevo sendMail failed", {
      status: response.status,
      response: body,
      message: err.message,
    });
    throw err;
  }

  const data = await response.json();
  return { messageId: data.messageId };
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
  const info = await sendViaBrevo({
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
  const info = await sendViaBrevo({
    to: email,
    subject: "ChatApp Test Email",
    text: "This is a test email from ChatApp. If you receive this, email delivery is configured correctly.",
    html: `
      <h2>ChatApp Test Email</h2>
      <p>If you receive this message, email delivery is configured correctly.</p>
    `,
  });

  logger.info(`Test email sent to ${email}: ${info.messageId}`);
  return info;
};
