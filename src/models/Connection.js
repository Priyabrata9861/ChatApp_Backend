import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Connection = sequelize.define(
  "Connection",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    requesterId: { type: DataTypes.INTEGER, allowNull: false },
    recipientId: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "pending",
      validate: { isIn: [["pending", "accepted"]] },
    },
  },
  {
    tableName: "connections",
    timestamps: true,
    indexes: [
      { unique: true, fields: ["requesterId", "recipientId"] },
      { fields: ["recipientId", "status"] },
    ],
    validate: {
      differentUsers() {
        if (this.requesterId === this.recipientId) {
          throw new Error("You cannot connect with yourself");
        }
      },
    },
  },
);

export default Connection;
