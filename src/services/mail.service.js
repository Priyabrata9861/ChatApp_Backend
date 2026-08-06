import nodemailer from "nodemailer";

const trimEnv = (value) => value?.trim();

const getEmailAuth = () => {
  const email = trimEnv(process.env.EMAIL);
  const rawPassword = process.env.APP_PASSWORD || "";
  const pass = rawPassword.replace(/\s+/g, "").trim();

  return { user: email, pass };
};

const getTransportOptions = () => {
  const auth = getEmailAuth();

  if (!auth.user || !auth.pass) {
    throw new Error(
      "Email service is not configured. Set EMAIL and APP_PASSWORD, or SMTP_HOST, SMTP_PORT, SMTP_SECURE, EMAIL, and APP_PASSWORD.",
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

export const isEmailConfigured = () => {
  try {
    getTransportOptions();
    return true;
  } catch {
    return false;
  }
};

export const sendOTP = async (email, otp) => {
  const transporter = createTransporter();

  const info = await transporter.sendMail({
    from: trimEnv(process.env.EMAIL),
    to: email,
    subject: "ChatApp OTP",
    text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    html: `
      <h2>Your OTP is ${otp}</h2>
      <p>It expires in 5 minutes.</p>
    `,
  });

  console.info(`OTP email queued for ${email}: ${info.messageId}`);

  return info;
};

export const sendTestEmail = async (email) => {
  const transporter = createTransporter();

  const info = await transporter.sendMail({
    from: trimEnv(process.env.EMAIL),
    to: email,
    subject: "ChatApp Test Email",
    text: "This is a test email from ChatApp. If you receive this, SMTP is configured correctly.",
    html: `
      <h2>ChatApp Test Email</h2>
      <p>If you receive this message, SMTP is configured correctly.</p>
    `,
  });

  console.info(`Test email queued for ${email}: ${info.messageId}`);
  return info;
};
