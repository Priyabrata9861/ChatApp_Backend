import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },

    name: {
      type: DataTypes.STRING,
    },

    avatar: {
      type: DataTypes.TEXT,
    },

    about: {
      type: DataTypes.STRING,
      defaultValue: "Hey there! I am using ChatApp",
    },

    isOnline: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    lastSeen: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: "users",
    timestamps: true,
  },
);

export default User;
