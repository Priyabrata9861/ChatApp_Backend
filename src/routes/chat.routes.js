import express from "express";
import { getConnections, getMessages, getUnreadCounts, markMessagesRead } from "../controllers/chat.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);
router.get("/connections", getConnections);
router.get("/unread", getUnreadCounts);
router.get("/messages/:userId", getMessages);
router.patch("/messages/:userId/read", markMessagesRead);

export default router;
