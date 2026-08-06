import mongoose from "mongoose";
import { autoIncrementPlugin, toJSONOptions } from "./base.js";

const otpSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: toJSONOptions, toObject: toJSONOptions },
);

otpSchema.index({ email: 1, verified: 1, createdAt: -1 });
otpSchema.plugin(autoIncrementPlugin, { modelName: "Otp" });

export default mongoose.model("Otp", otpSchema, "otp_verifications");
