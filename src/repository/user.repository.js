import User from "../models/User.js";
import OTP from "../models/Otp.js";
import { Op } from "sequelize";

export const findUserByEmail = (email) => {
  return User.findOne({
    where: {
      email,
    },
  });
};

export const findUserById = (userId) => User.findByPk(userId);

export const findOtherUsers = (userId) =>
  User.findAll({
    where: { id: { [Op.ne]: userId } },
    attributes: ["id", "email", "name", "avatar", "about", "isOnline", "lastSeen"],
    order: [["name", "ASC"]],
  });

export const createUser = (data) => User.create(data);

export const updateUserProfile = (userId, data) => {
  return User.update(data, {
    where: {
      id: userId,
    },
  });
};

export const saveOTP = async (data) => {
  await OTP.destroy({ where: { email: data.email, verified: false } });
  return OTP.create(data);
};

export const getOTP = (email) => {
  return OTP.findOne({
    where: {
      email,
      verified: false,
      expiresAt: { [Op.gt]: new Date() },
    },

    order: [["createdAt", "DESC"]],
  });
};
