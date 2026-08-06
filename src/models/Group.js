import mongoose from "mongoose";
import { autoIncrementPlugin, toJSONOptions } from "./base.js";

const groupSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    name: { type: String, required: true, maxlength: 80, trim: true },
    ownerId: { type: Number, required: true },
  },
  { timestamps: true, toJSON: toJSONOptions, toObject: toJSONOptions },
);

groupSchema.plugin(autoIncrementPlugin, { modelName: "Group" });

export default mongoose.model("Group", groupSchema, "groups");
