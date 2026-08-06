import mongoose from "mongoose";
import { autoIncrementPlugin, toJSONOptions } from "./base.js";

const userSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, trim: true },
    avatar: { type: String },
    about: { type: String, default: "Hey there! I am using ChatApp" },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date },
  },
  { timestamps: true, toJSON: toJSONOptions, toObject: toJSONOptions },
);

userSchema.plugin(autoIncrementPlugin, { modelName: "User" });

export default mongoose.model("User", userSchema, "users");
