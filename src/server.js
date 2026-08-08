import { setDefaultResultOrder } from "node:dns";
import dotenv from "dotenv";
import http from "node:http";
import app from "./app.js";

// Render's free tier does not support IPv6 egress. Gmail's SMTP (and MongoDB
// Atlas) may resolve to an IPv6 address first, which causes `ENETUNREACH`
// errors. Force Node to prefer IPv4 when resolving hostnames.
setDefaultResultOrder("ipv4first");
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
