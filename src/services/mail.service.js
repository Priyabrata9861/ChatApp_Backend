import nodemailer from "nodemailer";

const createTransporter = () => nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.APP_PASSWORD
    }
});

export const sendOTP = async (email, otp) => {
    const transporter = createTransporter();

    await transporter.sendMail({

        from: process.env.EMAIL,

        to: email,

        subject: "ChatApp OTP",

        html: `
            <h2>Your OTP is ${otp}</h2>
            <p>It expires in 5 minutes.</p>
        `

    });

};
