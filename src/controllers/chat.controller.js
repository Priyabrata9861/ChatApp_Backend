import { Op } from "sequelize";
import Connection from "../models/Connection.js";
import Message from "../models/Message.js";
import sequelize from "../config/database.js";
import { areBlocked } from "../services/social.service.js";

const connectionBetween = (firstUserId, secondUserId) => ({
  [Op.or]: [
    { requesterId: firstUserId, recipientId: secondUserId },
    { requesterId: secondUserId, recipientId: firstUserId },
  ],
});

export const getConnections = async (req, res) => {
  try {
    const connections = await Connection.findAll({
      where: {
        [Op.or]: [{ requesterId: req.user.id }, { recipientId: req.user.id }],
      },
      order: [["updatedAt", "DESC"]],
    });
    const items = await Promise.all(connections.map(async (connection) => {
      const lastMessage = connection.status === "accepted" ? await Message.findOne({
        where: {
          conversationId: connection.id,
          deletedForEveryone: false,
          [Op.or]: [
            { senderId: req.user.id, senderDeleted: false },
            { receiverId: req.user.id, receiverDeleted: false },
          ],
        },
        order: [["createdAt", "DESC"]],
      }) : null;
      return { ...connection.toJSON(), lastMessage };
    }));
    return res.json({ success: true, connections: items });
  } catch {
    return res.status(500).json({ message: "Unable to load connections" });
  }
};

export const getMessages = async (req, res) => {
  const otherUserId = Number(req.params.userId);
  if (!Number.isInteger(otherUserId)) {
    return res.status(400).json({ message: "Invalid user" });
  }

  try {
    if (await areBlocked(req.user.id, otherUserId)) {
      return res.status(403).json({ message: "This conversation is unavailable" });
    }
    const connection = await Connection.findOne({
      where: { ...connectionBetween(req.user.id, otherUserId), status: "accepted" },
    });
    if (!connection) {
      return res.status(403).json({ message: "Chat request must be accepted first" });
    }

    const messages = await Message.findAll({
      where: {
        conversationId: connection.id,
        deletedForEveryone: false,
        [Op.or]: [
          { senderId: req.user.id, senderDeleted: false },
          { receiverId: req.user.id, receiverDeleted: false },
        ],
      },
      order: [["createdAt", "ASC"]],
      limit: 200,
    });
    return res.json({ success: true, messages });
  } catch {
    return res.status(500).json({ message: "Unable to load messages" });
  }
};

export const getUnreadCounts = async (req, res) => {
  try {
    const counts = await Message.findAll({
      where: { receiverId: req.user.id, readAt: null, receiverDeleted: false, deletedForEveryone: false },
      attributes: ["senderId", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      group: ["senderId"],
      raw: true,
    });
    return res.json({
      success: true,
      unreadCounts: Object.fromEntries(counts.map((item) => [item.senderId, Number(item.count)])),
    });
  } catch {
    return res.status(500).json({ message: "Unable to load unread messages" });
  }
};

export const markMessagesRead = async (req, res) => {
  const senderId = Number(req.params.userId);
  if (!Number.isInteger(senderId)) return res.status(400).json({ message: "Invalid user" });
  try {
    await Message.update(
      { readAt: new Date() },
      { where: { senderId, receiverId: req.user.id, readAt: null } },
    );
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ message: "Unable to mark messages as read" });
  }
};
