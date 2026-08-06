import mongoose from "mongoose";
import { autoIncrementPlugin, toJSONOptions } from "./base.js";

const blockSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    blockerId: { type: Number, required: true },
    blockedId: { type: Number, required: true },
  },
  { timestamps: true, toJSON: toJSONOptions, toObject: toJSONOptions },
);

blockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });
blockSchema.plugin(autoIncrementPlugin, { modelName: "Block" });

export default mongoose.model("Block", blockSchema, "blocks");
