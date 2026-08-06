import mongoose from "mongoose";
import { autoIncrementPlugin, toJSONOptions } from "./base.js";

const groupMemberSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    groupId: { type: Number, required: true },
    userId: { type: Number, required: true },
    role: { type: String, required: true, default: "member" },
  },
  { timestamps: true, toJSON: toJSONOptions, toObject: toJSONOptions },
);

groupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });
groupMemberSchema.plugin(autoIncrementPlugin, { modelName: "GroupMember" });

export default mongoose.model("GroupMember", groupMemberSchema, "group_members");
