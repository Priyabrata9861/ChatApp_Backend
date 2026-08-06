import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "node:url";
import { ensureDatabaseConnected } from "./config/database.js";

import authRoutes from "./routes/auth.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import socialRoutes from "./routes/social.routes.js";
import groupRoutes from "./routes/group.routes.js";

const app = express();
const uploadsDirectory = fileURLToPath(new URL("../uploads", import.meta.url));

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(helmet());

if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

app.use(express.json({ limit: "100kb" }));

app.use(
  express.urlencoded({
    extended: false,
    limit: "100kb",
  }),
);

app.use(cookieParser());

app.use(
  "/uploads",
  express.static(uploadsDirectory, {
    maxAge: "7d",
    immutable: true,
    index: false,
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  }),
);

// API Routes

app.use("/api", ensureDatabaseConnected);

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/groups", groupRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,

    message: "Backend Running",
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
  const message =
    error.code === "LIMIT_FILE_SIZE"
      ? "Avatar must be smaller than 5 MB"
      : error.message || "Invalid request";

  return res.status(status).json({ success: false, message });
});

export default app;
