import nodemailer from "nodemailer";

const getEmailAuth = () => {
  const email = process.env.EMAIL?.trim();
  const rawPassword = process.env.APP_PASSWORD || "";
  const pass = rawPassword.replace(/\s+/g, "");

  return { user: email, pass };
};

const createTransporter = () =>
  nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: getEmailAuth(),
  });

export const sendOTP = async (email, otp) => {
  const transporter = createTransporter();

  const info = await transporter.sendMail({
    from: process.env.EMAIL?.trim(),
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
    from: process.env.EMAIL?.trim(),
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
