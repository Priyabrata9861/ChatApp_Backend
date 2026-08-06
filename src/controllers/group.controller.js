import { Op } from "sequelize";
import sequelize from "../config/database.js";
import Group from "../models/Group.js";
import GroupMember from "../models/GroupMember.js";
import GroupMessage from "../models/GroupMessage.js";
import User from "../models/User.js";
import { areBlocked, areFriends } from "../services/social.service.js";

const serializeGroup = async (group) => {
  const memberships = await GroupMember.findAll({ where: { groupId: group.id } });
  const users = await User.findAll({
    where: { id: { [Op.in]: memberships.map((item) => item.userId) } },
    attributes: ["id", "name", "email", "avatar", "isOnline", "lastSeen"],
  });
  const roleByUser = Object.fromEntries(memberships.map((item) => [item.userId, item.role]));
  return { ...group.toJSON(), members: users.map((user) => ({ ...user.toJSON(), role: roleByUser[user.id] })) };
};

const validateFriends = async (ownerId, memberIds) => {
  for (const memberId of memberIds) {
    if (!(await areFriends(ownerId, memberId)) || await areBlocked(ownerId, memberId)) {
      throw new Error("Only connected, unblocked friends can be added");
    }
  }
};

export const listGroups = async (req, res) => {
  try {
    const memberships = await GroupMember.findAll({ where: { userId: req.user.id } });
    const groups = await Group.findAll({ where: { id: { [Op.in]: memberships.map((item) => item.groupId) } }, order: [["updatedAt", "DESC"]] });
    return res.json({ success: true, groups: await Promise.all(groups.map(serializeGroup)) });
  } catch {
    return res.status(500).json({ message: "Unable to load groups" });
  }
};

export const createGroup = async (req, res) => {
  const name = String(req.body.name || "").trim();
  const memberIds = [...new Set((req.body.memberIds || []).map(Number))]
    .filter((id) => Number.isInteger(id) && id !== req.user.id);
  if (name.length < 2 || name.length > 80) return res.status(400).json({ message: "Group name must be 2 to 80 characters" });
  if (memberIds.length > 99) return res.status(400).json({ message: "A group can have at most 100 members" });
  try {
    await validateFriends(req.user.id, memberIds);
    const group = await sequelize.transaction(async (transaction) => {
      const created = await Group.create({ name, ownerId: req.user.id }, { transaction });
      await GroupMember.bulkCreate([
        { groupId: created.id, userId: req.user.id, role: "owner" },
        ...memberIds.map((userId) => ({ groupId: created.id, userId, role: "member" })),
      ], { transaction });
      return created;
    });
    return res.status(201).json({ success: true, group: await serializeGroup(group) });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const addGroupMembers = async (req, res) => {
  const memberIds = [...new Set((req.body.memberIds || []).map(Number))].filter(Number.isInteger);
  try {
    const group = await Group.findByPk(req.params.groupId);
    const actor = await GroupMember.findOne({ where: { groupId: req.params.groupId, userId: req.user.id } });
    if (!group || !actor || !["owner", "admin"].includes(actor.role)) return res.status(403).json({ message: "Only group admins can add people" });
    await validateFriends(req.user.id, memberIds);
    await GroupMember.bulkCreate(memberIds.map((userId) => ({ groupId: group.id, userId })), { ignoreDuplicates: true });
    return res.json({ success: true, group: await serializeGroup(group) });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.groupId);
    const membership = await GroupMember.findOne({ where: { groupId: req.params.groupId, userId: req.user.id } });
    if (!group || !membership) return res.status(404).json({ message: "Group not found" });
    await membership.destroy();
    const remaining = await GroupMember.findAll({ where: { groupId: group.id }, order: [["createdAt", "ASC"]] });
    if (!remaining.length) await group.destroy();
    else if (group.ownerId === req.user.id) {
      await remaining[0].update({ role: "owner" });
      await group.update({ ownerId: remaining[0].userId });
    }
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ message: "Unable to leave group" });
  }
};

export const getGroupMessages = async (req, res) => {
  try {
    const membership = await GroupMember.findOne({ where: { groupId: req.params.groupId, userId: req.user.id } });
    if (!membership) return res.status(403).json({ message: "You are not a group member" });
    const messages = await GroupMessage.findAll({ where: { groupId: req.params.groupId }, order: [["createdAt", "ASC"]], limit: 300 });
    return res.json({ success: true, messages });
  } catch {
    return res.status(500).json({ message: "Unable to load group messages" });
  }
};
