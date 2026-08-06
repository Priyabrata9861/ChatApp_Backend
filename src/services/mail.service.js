import nodemailer from "nodemailer";

const createTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.APP_PASSWORD,
    },
  });

export const sendOTP = async (email, otp) => {
  const transporter = createTransporter();

  const info = await transporter.sendMail({
    from: process.env.EMAIL,
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
