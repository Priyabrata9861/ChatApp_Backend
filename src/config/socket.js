import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import Connection from "../models/Connection.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import GroupMember from "../models/GroupMember.js";
import GroupMessage from "../models/GroupMessage.js";
import { areBlocked, areFriends } from "../services/social.service.js";

const roomFor = (userId) => `user:${userId}`;
const groupRoom = (groupId) => `group:${groupId}`;
const connectionBetween = (firstUserId, secondUserId) => ({
  [Op.or]: [
    { requesterId: firstUserId, recipientId: secondUserId },
    { requesterId: secondUserId, recipientId: firstUserId },
  ],
});

export const initializeSocket = (server) => {
  const origins = (process.env.CORS_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const io = new Server(server, { cors: { origin: origins, credentials: true } });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      socket.userId = jwt.verify(token, process.env.JWT_SECRET).id;
      next();
    } catch {
      next(new Error("Invalid authentication token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = Number(socket.userId);
    socket.join(roomFor(userId));
    const groupMemberships = await GroupMember.findAll({ where: { userId } });
    groupMemberships.forEach((membership) => socket.join(groupRoom(membership.groupId)));
    await User.update({ isOnline: true }, { where: { id: userId } });
    io.emit("presence:update", { userId, isOnline: true });

    socket.on("connection:send", async ({ recipientId }, reply = () => {}) => {
      try {
        const targetId = Number(recipientId);
        if (!Number.isInteger(targetId) || targetId === userId) {
          throw new Error("Invalid recipient");
        }
        if (!(await User.findByPk(targetId))) throw new Error("User not found");
        if (await areBlocked(userId, targetId)) throw new Error("This user is unavailable");

        const existing = await Connection.findOne({
          where: connectionBetween(userId, targetId),
        });
        if (existing) throw new Error("A request already exists");

        const connection = await Connection.create({ requesterId: userId, recipientId: targetId });
        const payload = { ...connection.toJSON(), eventType: "request", notifyUserId: targetId };
        io.to(roomFor(userId)).to(roomFor(targetId)).emit("connection:update", payload);
        reply({ ok: true, connection: payload });
      } catch (error) {
        reply({ ok: false, message: error.message });
      }
    });

    socket.on("connection:respond", async ({ connectionId, action }, reply = () => {}) => {
      try {
        const connection = await Connection.findByPk(Number(connectionId));
        if (!connection || connection.recipientId !== userId || connection.status !== "pending") {
          throw new Error("Request not found");
        }
        if (action === "reject") {
          const payload = { ...connection.toJSON(), status: "rejected", eventType: "rejected", notifyUserId: connection.requesterId };
          await connection.destroy();
          io.to(roomFor(connection.requesterId)).to(roomFor(userId)).emit("connection:update", payload);
          return reply({ ok: true });
        }
        if (action !== "accept") throw new Error("Invalid action");

        await connection.update({ status: "accepted" });
        const payload = { ...connection.toJSON(), eventType: "accepted", notifyUserId: connection.requesterId };
        io.to(roomFor(connection.requesterId)).to(roomFor(userId)).emit("connection:update", payload);
        reply({ ok: true, connection: payload });
      } catch (error) {
        reply({ ok: false, message: error.message });
      }
    });

    socket.on("message:send", async ({ recipientId, message }, reply = () => {}) => {
      try {
        const targetId = Number(recipientId);
        const text = String(message || "").trim();
        if (!text || text.length > 4000) throw new Error("Message must be between 1 and 4000 characters");

        if (await areBlocked(userId, targetId)) throw new Error("This user is unavailable");
        const connection = await Connection.findOne({
          where: { ...connectionBetween(userId, targetId), status: "accepted" },
        });
        if (!connection) throw new Error("Chat request must be accepted first");

        const savedMessage = await Message.create({
          conversationId: connection.id,
          senderId: userId,
          receiverId: targetId,
          message: text,
        });
        const payload = { ...savedMessage.toJSON(), recipientId: targetId };
        io.to(roomFor(userId)).to(roomFor(targetId)).emit("message:new", payload);
        reply({ ok: true, message: payload });
      } catch (error) {
        reply({ ok: false, message: error.message });
      }
    });

    socket.on("group:join", async ({ groupId }) => {
      const membership = await GroupMember.findOne({ where: { groupId: Number(groupId), userId } });
      if (membership) socket.join(groupRoom(membership.groupId));
    });

    socket.on("group:message:send", async ({ groupId, message }, reply = () => {}) => {
      try {
        const numericGroupId = Number(groupId);
        const text = String(message || "").trim();
        if (!text || text.length > 4000) throw new Error("Message must be between 1 and 4000 characters");
        const membership = await GroupMember.findOne({ where: { groupId: numericGroupId, userId } });
        if (!membership) throw new Error("You are not a member of this group");
        const saved = await GroupMessage.create({ groupId: numericGroupId, senderId: userId, message: text });
        const payload = saved.toJSON();
        io.to(groupRoom(numericGroupId)).emit("group:message:new", payload);
        reply({ ok: true, message: payload });
      } catch (error) {
        reply({ ok: false, message: error.message });
      }
    });

    const relayCall = (incomingEvent, outgoingEvent) => {
      socket.on(incomingEvent, async ({ recipientId, ...payload }, reply = () => {}) => {
        try {
          const targetId = Number(recipientId);
          if (!(await areFriends(userId, targetId)) || await areBlocked(userId, targetId)) {
            throw new Error("Calls are only available between connected users");
          }
          io.to(roomFor(targetId)).emit(outgoingEvent, { ...payload, senderId: userId });
          reply({ ok: true });
        } catch (error) {
          reply({ ok: false, message: error.message });
        }
      });
    };

    relayCall("call:offer", "call:incoming");
    relayCall("call:answer", "call:answered");
    relayCall("call:ice", "call:ice");
    relayCall("call:end", "call:ended");

    socket.on("message:read", async ({ senderId }) => {
      const otherUserId = Number(senderId);
      if (!Number.isInteger(otherUserId)) return;
      await Message.update(
        { readAt: new Date() },
        { where: { senderId: otherUserId, receiverId: userId, readAt: null } },
      );
    });

    socket.on("message:delete-all", async ({ recipientId }, reply = () => {}) => {
      try {
        const targetId = Number(recipientId);
        const connection = await Connection.findOne({
          where: { ...connectionBetween(userId, targetId), status: "accepted" },
        });
        if (!connection) throw new Error("Conversation not found");
        await Message.destroy({ where: { conversationId: connection.id } });
        const payload = { conversationId: connection.id, userIds: [userId, targetId] };
        io.to(roomFor(userId)).to(roomFor(targetId)).emit("messages:cleared", payload);
        reply({ ok: true });
      } catch (error) {
        reply({ ok: false, message: error.message });
      }
    });

    socket.on("message:delete", async ({ messageId, mode }, reply = () => {}) => {
      try {
        const message = await Message.findByPk(Number(messageId));
        if (!message || ![message.senderId, message.receiverId].includes(userId)) {
          throw new Error("Message not found");
        }
        if (mode === "everyone") {
          if (message.senderId !== userId) throw new Error("Only the sender can delete for everyone");
          await message.update({ deletedForEveryone: true });
          const payload = { messageId: message.id, mode, senderId: message.senderId, receiverId: message.receiverId };
          io.to(roomFor(message.senderId)).to(roomFor(message.receiverId)).emit("message:deleted", payload);
          return reply({ ok: true });
        }
        if (mode !== "me") throw new Error("Invalid delete option");
        await message.update(message.senderId === userId ? { senderDeleted: true } : { receiverDeleted: true });
        socket.emit("message:deleted", { messageId: message.id, mode, senderId: message.senderId, receiverId: message.receiverId });
        reply({ ok: true });
      } catch (error) {
        reply({ ok: false, message: error.message });
      }
    });

    socket.on("disconnect", async () => {
      try {
        const remainingSockets = io.sockets.adapter.rooms.get(roomFor(userId))?.size || 0;
        if (remainingSockets === 0) {
          const lastSeen = new Date();
          await User.update({ isOnline: false, lastSeen }, { where: { id: userId } });
          io.emit("presence:update", { userId, isOnline: false, lastSeen });
        }
      } catch (error) {
        console.error("Unable to update user presence:", error.message);
      }
    });
  });

  return io;
};
