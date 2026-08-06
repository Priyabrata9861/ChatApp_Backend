import express from "express";
import { blockUser, getBlocks, unblockUser } from "../controllers/social.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();
router.use(protect);
router.get("/blocks", getBlocks);
router.post("/blocks/:userId", blockUser);
router.delete("/blocks/:userId", unblockUser);
export default router;
