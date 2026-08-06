import express from "express";
import { addGroupMembers, createGroup, getGroupMessages, leaveGroup, listGroups } from "../controllers/group.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();
router.use(protect);
router.get("/", listGroups);
router.post("/", createGroup);
router.post("/:groupId/members", addGroupMembers);
router.delete("/:groupId/members/me", leaveGroup);
router.get("/:groupId/messages", getGroupMessages);
export default router;
