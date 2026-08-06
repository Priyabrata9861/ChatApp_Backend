import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const GroupMessage = sequelize.define("GroupMessage", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  groupId: { type: DataTypes.INTEGER, allowNull: false },
  senderId: { type: DataTypes.INTEGER, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
}, {
  tableName: "group_messages",
  timestamps: true,
  indexes: [{ fields: ["groupId", "createdAt"] }],
});

export default GroupMessage;
