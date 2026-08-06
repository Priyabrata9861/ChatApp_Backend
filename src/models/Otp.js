import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const OTP = sequelize.define("Otp",{

    id:{
    type:DataTypes.INTEGER,
    primaryKey:true,
    autoIncrement:true
    },
    
    email:{
    type:DataTypes.STRING,
    allowNull:false
    },
    
    otp:{
    type:DataTypes.STRING,
    allowNull:false
    },
    
    expiresAt:{
    type:DataTypes.DATE
    },
    
    verified:{
    type:DataTypes.BOOLEAN,
    defaultValue:false
    }
    
    
    },{
    tableName:"otp_verifications",
    timestamps:true,
    indexes: [{ fields: ["email", "verified", "createdAt"] }]
    })
    export default OTP;
