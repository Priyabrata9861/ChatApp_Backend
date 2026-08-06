import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const mongoUri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/chatapp";

let connectionPromise = null;

export const connectDatabase = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectionPromise) return connectionPromise;

  mongoose.set("strictQuery", true);
  connectionPromise = mongoose.connect(mongoUri);
  return connectionPromise;
};

export const ensureDatabaseConnected = async (req, res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Database connection failed: ${error.message}`,
    });
  }
};

export default mongoose;
