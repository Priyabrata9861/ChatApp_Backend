import mongoose from "mongoose";
import { autoIncrementPlugin, toJSONOptions } from "./base.js";

const connectionSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    requesterId: { type: Number, required: true },
    recipientId: { type: Number, required: true },
    status: { type: String, required: true, enum: ["pending", "accepted"], default: "pending" },
  },
  { timestamps: true, toJSON: toJSONOptions, toObject: toJSONOptions },
);

connectionSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });
connectionSchema.index({ recipientId: 1, status: 1 });
connectionSchema.pre("validate", function validateDifferentUsers(next) {
  if (this.requesterId === this.recipientId) return next(new Error("You cannot connect with yourself"));
  return next();
});
connectionSchema.plugin(autoIncrementPlugin, { modelName: "Connection" });

export default mongoose.model("Connection", connectionSchema, "connections");
