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

import { generateOTP, sendOTP } from "../services/otp.service.js";

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

    const otp = generateOTP();

    await saveOTP({
      email: email,

      otp,

      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    res.json({
      success: true,

      message: "OTP Sent",
    });

    sendOTP(email, otp).catch((error) => {
      console.error("Failed to send OTP email:", error.message);
    });
  } catch (error) {
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
