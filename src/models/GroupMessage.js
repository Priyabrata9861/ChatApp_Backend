import mongoose from "mongoose";
import { autoIncrementPlugin, toJSONOptions } from "./base.js";

const groupMessageSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    groupId: { type: Number, required: true, index: true },
    senderId: { type: Number, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true, toJSON: toJSONOptions, toObject: toJSONOptions },
);

groupMessageSchema.index({ groupId: 1, createdAt: 1 });
groupMessageSchema.plugin(autoIncrementPlugin, { modelName: "GroupMessage" });

export default mongoose.model("GroupMessage", groupMessageSchema, "group_messages");
