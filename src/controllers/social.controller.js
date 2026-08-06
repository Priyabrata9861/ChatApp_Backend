import Block from "../models/Block.js";
import Connection from "../models/Connection.js";
import User from "../models/User.js";
import { pairWhere } from "../services/social.service.js";

export const getBlocks = async (req, res) => {
  try {
    const blocks = await Block.findAll({ where: { blockerId: req.user.id } });
    return res.json({ success: true, blockedUserIds: blocks.map((item) => item.blockedId) });
  } catch {
    return res.status(500).json({ message: "Unable to load blocked users" });
  }
};

export const blockUser = async (req, res) => {
  const blockedId = Number(req.params.userId);
  if (!Number.isInteger(blockedId) || blockedId === req.user.id) {
    return res.status(400).json({ message: "Invalid user" });
  }
  try {
    if (!(await User.findByPk(blockedId))) return res.status(404).json({ message: "User not found" });
    await Block.findOrCreate({ where: { blockerId: req.user.id, blockedId } });
    await Connection.destroy({
      where: pairWhere(req.user.id, blockedId, "requesterId", "recipientId"),
    });
    return res.json({ success: true, blockedId });
  } catch {
    return res.status(500).json({ message: "Unable to block user" });
  }
};

export const unblockUser = async (req, res) => {
  const blockedId = Number(req.params.userId);
  try {
    await Block.destroy({ where: { blockerId: req.user.id, blockedId } });
    return res.json({ success: true, blockedId });
  } catch {
    return res.status(500).json({ message: "Unable to unblock user" });
  }
};
