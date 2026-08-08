import {
  emailSchema,
  otpSchema,
  profileSchema,
} from "../validations/auth.validation.js";

import {
  saveOTP,
  getOTP,
  findUserByEmail,
  findUserById,
  findOtherUsers,
  createUser,
  updateUserProfile,
} from "../repository/user.repository.js";
import OTP from "../models/Otp.js";

import { generateOTP, sendOTP } from "../services/otp.service.js";
import { sendTestEmail as sendTestEmailMessage } from "../services/mail.service.js";
import { logger } from "../utils/logger.js";

import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const uploadsDirectory = fileURLToPath(new URL("../../uploads", import.meta.url));
const avatarExtensions = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const sendEmailOTP = async (req, res) => {
  try {
    const { error, value } = emailSchema.validate(req.body);

    if (error)
      return res.status(400).json({
        message: error.message,
      });

    const { email } = value;

    // Idempotency: if a recent, unexpired OTP already exists for this email,
    // resend the SAME code instead of generating a new one. This keeps retries
    // from the axios cold-start interceptor from sending duplicate OTP emails
    // and confusing the user (only the most recent code will validate).
    const existing = await OTP.findOne({
      email,
      verified: false,
      expiresAt: { $gt: new Date(Date.now() - 60 * 1000) },
    }).sort({ createdAt: -1 });

    const otp = existing?.otp || generateOTP();

    if (!existing) {
      await saveOTP({
        email,
        otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
    }

    try {
      const info = await sendOTP(email, otp);
      logger.info(`OTP email queued for ${email}: ${info.messageId}`);

      return res.json({
        success: true,
        message: "OTP Sent",
      });
    } catch (error) {
      // Keep the client-facing message generic for security, but log the FULL
      // underlying cause (missing env vars, SMTP auth failure, SMTP detail)
      // so it can be diagnosed from the deployment console.
      logger.error(
        `Failed to send OTP email to ${email}`,
        {
          name: error?.name,
          code: error?.code,
          command: error?.command,
          response: error?.response,
          message: error?.message,
        },
      );

      return res.status(500).json({
        success: false,
        message: "Unable to send OTP email. Please try again later.",
      });
    }
  } catch (error) {
    logger.error(`Unexpected error in sendEmailOTP flow for ${req.body?.email}`, error);
    res.status(500).json({
      message: error.message,
    });
  }
};

export const sendTestEmail = async (req, res) => {
  try {
    const { error, value } = emailSchema.validate(req.body);

    if (error)
      return res.status(400).json({
        message: error.message,
      });

    const { email } = value;
    const info = await sendTestEmailMessage(email);
    logger.info(`Test email queued for ${email}: ${info.messageId}`);

    res.json({
      success: true,
      message: "Test email sent",
      messageId: info.messageId,
    });
  } catch (error) {
    logger.error(`sendTestEmail failed`, error);
    res.status(500).json({
      message: error.message,
    });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { error, value } = otpSchema.validate(req.body);

    if (error)
      return res.status(400).json({
        message: error.message,
      });

    const { email, otp } = value;

    const record = await getOTP(email);

    if (!record)
      return res.status(400).json({
        message: "OTP expired",
      });

    if (record.otp !== otp)
      return res.status(400).json({
        message: "Invalid OTP",
      });

    await record.update({ verified: true });

    let user = await findUserByEmail(email);
    const isNewUser = !user;

    if (isNewUser) {
      user = await createUser({
        email,
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
      },

      process.env.JWT_SECRET,

      {
        expiresIn: "7d",
      },
    );

    res.json({
      success: true,

      token,

      user,

      isNewUser,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { error, value } = profileSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const userId = req.user.id;

    const [updatedCount] = await updateUserProfile(userId, value);

    if (!updatedCount) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = await findUserById(userId);

    res.json({
      success: true,
      message: "Profile Updated",
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const updateAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Please select an image" });
  }

  const extension = avatarExtensions[req.file.mimetype];
  const filename = `${req.user.id}-${randomUUID()}${extension}`;
  const filePath = path.join(uploadsDirectory, filename);
  const avatar = `/uploads/${filename}`;

  try {
    const currentUser = await findUserById(req.user.id);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const previousAvatar = currentUser.avatar;

    await mkdir(uploadsDirectory, { recursive: true });
    await writeFile(filePath, req.file.buffer);
    await currentUser.update({ avatar });

    if (previousAvatar?.startsWith("/uploads/")) {
      const previousFile = path.join(
        uploadsDirectory,
        path.basename(previousAvatar),
      );
      await unlink(previousFile).catch(() => {});
    }

    return res.json({
      success: true,
      message: "Profile photo updated",
      user: currentUser,
    });
  } catch {
    await unlink(filePath).catch(() => {});
    return res.status(500).json({ message: "Unable to update profile photo" });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await findOtherUsers(req.user.id);
    return res.json({ success: true, users });
  } catch {
    return res.status(500).json({ message: "Unable to load users" });
  }
};
