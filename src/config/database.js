import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const mongoUri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/chatapp";

export const connectDatabase = async () => {
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri);
};

export default mongoose;
