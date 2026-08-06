import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Message = sequelize.define("Message",{


    id:{
    type:DataTypes.INTEGER,
    primaryKey:true,
    autoIncrement:true
    },
    
    
    conversationId:{
    type:DataTypes.INTEGER,
    allowNull:false
    },
    
    
    senderId:{
    type:DataTypes.INTEGER,
    allowNull:false
    },

    receiverId:{
    type:DataTypes.INTEGER,
    allowNull:true
    },
    
    
    message:{
    type:DataTypes.TEXT
    },
    
    
    messageType:{
    type:DataTypes.STRING,
    defaultValue:"TEXT"
    },

    readAt:{
    type:DataTypes.DATE,
    allowNull:true
    },

    senderDeleted:{
    type:DataTypes.BOOLEAN,
    allowNull:false,
    defaultValue:false
    },

    receiverDeleted:{
    type:DataTypes.BOOLEAN,
    allowNull:false,
    defaultValue:false
    },

    deletedForEveryone:{
    type:DataTypes.BOOLEAN,
    allowNull:false,
    defaultValue:false
    }
    
    
    },{
    tableName:"messages",
    timestamps:true,
    indexes: [
      { fields: ["conversationId", "createdAt"] },
      { fields: ["receiverId", "readAt"] }
    ]
    })
    export default Message;
