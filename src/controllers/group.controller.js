import Group from "../models/Group.js";
import GroupMember from "../models/GroupMember.js";
import GroupMessage from "../models/GroupMessage.js";
import User from "../models/User.js";
import { areBlocked, areFriends } from "../services/social.service.js";

const serializeGroup = async (group) => {
  const memberships = await GroupMember.find({ groupId: group.id });
  const users = await User.find({ id: { $in: memberships.map((item) => item.userId) } })
    .select("id name email avatar isOnline lastSeen createdAt updatedAt");
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
    const memberships = await GroupMember.find({ userId: req.user.id });
    const groups = await Group.find({ id: { $in: memberships.map((item) => item.groupId) } }).sort({ updatedAt: -1 });
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
    const group = await Group.create({ name, ownerId: req.user.id });
    try {
      await Promise.all([
        GroupMember.create({ groupId: group.id, userId: req.user.id, role: "owner" }),
        ...memberIds.map((userId) => GroupMember.create({ groupId: group.id, userId, role: "member" })),
      ]);
    } catch (error) {
      await group.deleteOne();
      throw error;
    }
    return res.status(201).json({ success: true, group: await serializeGroup(group) });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const addGroupMembers = async (req, res) => {
  const memberIds = [...new Set((req.body.memberIds || []).map(Number))].filter(Number.isInteger);
  try {
    const group = await Group.findOne({ id: Number(req.params.groupId) });
    const actor = await GroupMember.findOne({ groupId: Number(req.params.groupId), userId: req.user.id });
    if (!group || !actor || !["owner", "admin"].includes(actor.role)) return res.status(403).json({ message: "Only group admins can add people" });
    await validateFriends(req.user.id, memberIds);
    await Promise.all(memberIds.map(async (userId) => {
      const existing = await GroupMember.findOne({ groupId: group.id, userId });
      if (!existing) await GroupMember.create({ groupId: group.id, userId });
    }));
    return res.json({ success: true, group: await serializeGroup(group) });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const group = await Group.findOne({ id: Number(req.params.groupId) });
    const membership = await GroupMember.findOne({ groupId: Number(req.params.groupId), userId: req.user.id });
    if (!group || !membership) return res.status(404).json({ message: "Group not found" });
    await membership.deleteOne();
    const remaining = await GroupMember.find({ groupId: group.id }).sort({ createdAt: 1 });
    if (!remaining.length) await group.deleteOne();
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
    const groupId = Number(req.params.groupId);
    const membership = await GroupMember.findOne({ groupId, userId: req.user.id });
    if (!membership) return res.status(403).json({ message: "You are not a group member" });
    const messages = await GroupMessage.find({ groupId }).sort({ createdAt: 1 }).limit(300);
    return res.json({ success: true, messages });
  } catch {
    return res.status(500).json({ message: "Unable to load group messages" });
  }
};
