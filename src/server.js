import dotenv from "dotenv";
import http from "node:http";
import app from "./app.js";
import sequelize from "./config/database.js";

import User from "./models/User.js";
import "./models/Otp.js";
import "./models/Message.js";
import "./models/Connection.js";
import "./models/Block.js";
import "./models/Group.js";
import "./models/GroupMember.js";
import "./models/GroupMessage.js";
import { initializeSocket } from "./config/socket.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initializeSocket(server);


try {

    await sequelize.authenticate();

    console.log("✅ Database Connected");


    // Schema changes should use migrations in production; `alter` is expensive
    // and can lock tables on every restart.
    await sequelize.sync({ alter: process.env.NODE_ENV !== "production" });

    console.log("✅ Tables Synced");

    // A server restart disconnects every socket, so no previously-online user
    // should remain stuck in an online state.
    await User.update(
        { isOnline: false, lastSeen: new Date() },
        { where: { isOnline: true } },
    );


    server.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });


} catch(error){

    console.error("Database Error:", error);

}
