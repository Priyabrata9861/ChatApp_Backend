import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Group = sequelize.define("Group", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(80), allowNull: false },
  ownerId: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: "groups", timestamps: true });

export default Group;
