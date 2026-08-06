import User from "../models/User.js";
import OTP from "../models/Otp.js";

export const findUserByEmail = (email) => User.findOne({ email });

export const findUserById = (userId) => User.findOne({ id: Number(userId) });

export const findOtherUsers = (userId) =>
  User.find({ id: { $ne: Number(userId) } })
    .select("id email name avatar about isOnline lastSeen createdAt updatedAt")
    .sort({ name: 1 });

export const createUser = (data) => User.create(data);

export const updateUserProfile = async (userId, data) => {
  const result = await User.updateOne({ id: Number(userId) }, data);
  return [result.matchedCount];
};

export const saveOTP = async (data) => {
  await OTP.deleteMany({ email: data.email, verified: false });
  return OTP.create(data);
};

export const getOTP = (email) =>
  OTP.findOne({
    email,
    verified: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
