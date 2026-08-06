import Block from "../models/Block.js";
import Connection from "../models/Connection.js";

export const pairWhere = (firstUserId, secondUserId, firstKey, secondKey) => ({
  $or: [
    { [firstKey]: firstUserId, [secondKey]: secondUserId },
    { [firstKey]: secondUserId, [secondKey]: firstUserId },
  ],
});

export const areBlocked = async (firstUserId, secondUserId) =>
  Boolean(await Block.findOne(pairWhere(firstUserId, secondUserId, "blockerId", "blockedId")));

export const areFriends = async (firstUserId, secondUserId) =>
  Boolean(await Connection.findOne({
    ...pairWhere(firstUserId, secondUserId, "requesterId", "recipientId"),
    status: "accepted",
  }));
