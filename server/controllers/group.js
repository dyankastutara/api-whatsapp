const { initializeSocket } = require("../connection");

module.exports = {
  get: {
    all: async (req, res) => {
      let finalResult = {
        data: [],
        success: false,
        message: "",
      };
      try {
        const socket = await initializeSocket(req.params.sessionId);
        await new Promise(async (resolve, reject) => {
          await socket.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === "close") {
              const error = new Error(lastDisconnect?.error?.message);
              error.status = lastDisconnect?.error?.statusCode;
              reject(error);
            } else if (connection === "open") {
              console.log("Koneksi berhasil!");
              const groups = await socket.groupFetchAllParticipating();
              finalResult.data = groups;
              finalResult.success = true;
              finalResult.message = "Berhasil ambil grup whatsapp";
              resolve(finalResult);
            }
          });
          await socket.ev.on("error", (e) => {
            const error = new Error(e.message);
            error.status = e.statusCode;
            reject(error);
          });
        });
        res.status(200).json(finalResult);
      } catch (e) {
        const status = e.status || 500;
        finalResult.message = e.message || "Internal server error";
        res.status(status).json(finalResult);
      }
    },
    by_id: async (req, res) => {
      let finalResult = {
        data: {},
        success: false,
        message: "",
      };
      try {
        const socket = await initializeSocket(req.params.sessionId);
        await new Promise(async (resolve, reject) => {
          await socket.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === "close") {
              const error = new Error(lastDisconnect?.error?.message);
              error.status = lastDisconnect?.error?.statusCode;
              reject(error);
            } else if (connection === "open") {
              console.log("Koneksi berhasil!");
              const groupMetadata = await socket.groupMetadata(
                req.query.groupId
              );
              finalResult.data = {
                ...groupMetadata,
                participants: groupMetadata.participants.map((item) => ({
                  ...item,
                  number: item.id.split("@")[0],
                })),
              };
              finalResult.success = true;
              finalResult.message = "Berhasil ambil grup whatsapp";
              resolve(finalResult);
            }
          });
          await socket.ev.on("error", (e) => {
            const error = new Error(e.message);
            error.status = e.statusCode;
            reject(error);
          });
        });
        res.status(200).json(finalResult);
      } catch (e) {
        const status = e.status || 500;
        finalResult.message = e.message || "Internal server error";
        res.status(status).json(finalResult);
      }
    },
  },
};
