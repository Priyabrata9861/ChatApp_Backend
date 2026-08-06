import { Op } from "sequelize";
import Block from "../models/Block.js";
import Connection from "../models/Connection.js";

export const pairWhere = (firstUserId, secondUserId, firstKey, secondKey) => ({
  [Op.or]: [
    { [firstKey]: firstUserId, [secondKey]: secondUserId },
    { [firstKey]: secondUserId, [secondKey]: firstUserId },
  ],
});

export const areBlocked = async (firstUserId, secondUserId) => Boolean(await Block.findOne({
  where: pairWhere(firstUserId, secondUserId, "blockerId", "blockedId"),
}));

export const areFriends = async (firstUserId, secondUserId) => Boolean(await Connection.findOne({
  where: {
    ...pairWhere(firstUserId, secondUserId, "requesterId", "recipientId"),
    status: "accepted",
  },
}));
