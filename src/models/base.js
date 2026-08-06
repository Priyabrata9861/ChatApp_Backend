import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.models.Counter || mongoose.model("Counter", counterSchema, "counters");

export const toJSONOptions = {
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
};

export const autoIncrementPlugin = (schema, { modelName }) => {
  schema.pre("save", async function assignId(next) {
    if (!this.isNew || this.id) return next();

    try {
      const counter = await Counter.findByIdAndUpdate(
        modelName,
        { $inc: { seq: 1 } },
        { new: true, upsert: true },
      );
      this.id = counter.seq;
      return next();
    } catch (error) {
      return next(error);
    }
  });

  schema.methods.update = function updateDocument(data) {
    Object.assign(this, data);
    return this.save();
  };

  schema.methods.destroy = function destroyDocument() {
    return this.deleteOne();
  };
};
