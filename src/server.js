import dotenv from "dotenv";
import http from "node:http";
import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import User from "./models/User.js";
import "./models/index.js";
import { initializeSocket } from "./config/socket.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initializeSocket(server);

try {
  await connectDatabase();

  console.log("Database connected");

  await User.updateMany(
    { isOnline: true },
    { isOnline: false, lastSeen: new Date() },
  );

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
} catch (error) {
  console.error("Database Error:", error);
}
