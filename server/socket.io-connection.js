const { Server } = require("socket.io");

const io = new Server(process.env.PORT_SOCKET_IO, {
  cors: {
    origin: "http://localhost:5173", // Ganti dengan URL React Anda
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  },
});

const userSockets = {};
const initializeSocketIo = () => {
  // Socket.IO logic
  io.on("connection", (socket) => {
    // Mendapatkan userId dari client (misalnya, setelah autentikasi)
    socket.on("register", (userId) => {
      userSockets[userId] = socket.id; // Mapping userId ke socket.id
      console.log(`User ${userId} registered with socket ID: ${socket.id}`);
    });
    socket.on("disconnect", () => {
      for (const [userId, sId] of Object.entries(userSockets)) {
        if (sId === socketId) {
          delete userSockets[userId];
          console.log(`User ${userId} disconnected`);
          break;
        }
      }
    });
  });
};

const notifyWaAccountConnected = (userId, account) => {
  const socketId = userSockets[userId];
  if (socketId) {
    io.to(socketId).emit("wa_account_connected", account);
    console.log(`Sent update to user ${userId}:`, account);
  } else {
    console.log(`User ${userId} is not connected`);
  }
};
const notifiWaAccountDisconnect = (userId, account) => {
  const socketId = userSockets[userId];
  if (socketId) {
    io.to(socketId).emit("wa_account_disconnected", account);
    console.log(`Sent update to user ${userId}:`, account);
    for (const [userId, sId] of Object.entries(userSockets)) {
      if (sId === socketId) {
        delete userSockets[userId];
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  } else {
    console.log(`User ${userId} is not connected`);
  }
};
module.exports = {
  initializeSocketIo,
  notifyWaAccountConnected,
  notifiWaAccountDisconnect,
};
