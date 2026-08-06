import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const GroupMember = sequelize.define("GroupMember", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  groupId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  role: { type: DataTypes.STRING, allowNull: false, defaultValue: "member" },
}, {
  tableName: "group_members",
  timestamps: true,
  indexes: [{ unique: true, fields: ["groupId", "userId"] }],
});

export default GroupMember;
