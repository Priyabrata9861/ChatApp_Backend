import mongoose from "mongoose";
import { autoIncrementPlugin, toJSONOptions } from "./base.js";

const messageSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    conversationId: { type: Number, required: true, index: true },
    senderId: { type: Number, required: true, index: true },
    receiverId: { type: Number, index: true },
    message: { type: String },
    messageType: { type: String, default: "TEXT" },
    readAt: { type: Date, default: null },
    senderDeleted: { type: Boolean, required: true, default: false },
    receiverDeleted: { type: Boolean, required: true, default: false },
    deletedForEveryone: { type: Boolean, required: true, default: false },
  },
  { timestamps: true, toJSON: toJSONOptions, toObject: toJSONOptions },
);

messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ receiverId: 1, readAt: 1 });
messageSchema.plugin(autoIncrementPlugin, { modelName: "Message" });

export default mongoose.model("Message", messageSchema, "messages");
