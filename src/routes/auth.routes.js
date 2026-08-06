import express from "express";

import {
  sendEmailOTP,
  verifyOTP,
  updateProfile,
  updateAvatar,
  getUsers,
} from "../controllers/auth.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { uploadAvatar } from "../middleware/avatar.middleware.js";

const router = express.Router();

router.post("/send-otp", sendEmailOTP);

router.post("/verify-otp", verifyOTP);

router.put("/profile", protect, updateProfile);

router.put("/profile/avatar", protect, uploadAvatar.single("avatar"), updateAvatar);

router.get("/users", protect, getUsers);

export default router;
