const { initializeSocket } = require("../connection");

module.exports = {
  send_message: {
    by_phone_number: async (req, res) => {
      let finalResult = {
        data: {},
        succes: false,
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
              const phone_number = req.body.phone_no + "@s.whatsapp.net";
              const send = await socket.sendMessage(phone_number, {
                text: req.body.message,
              });
              finalResult.data = send;
              finalResult.success = true;
              finalResult.message = "Berhasil kirim pesan ke penerima";
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
    personal: async (req, res) => {
      let finalResult = {
        data: {},
        succes: false,
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
              const send = await socket.sendMessage(req.body.recipient, {
                text: req.body.message,
              });
              finalResult.data = send;
              finalResult.success = true;
              finalResult.message = "Berhasil kirim pesan ke penerima";
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
    group: async (req, res) => {
      let finalResult = {
        data: {},
        succes: false,
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
              const send = await socket.sendMessage(req.body.groupId, {
                text: req.body.message,
              });
              finalResult.data = send;
              finalResult.success = true;
              finalResult.message = "Berhasil kirim pesan ke grup whatsapp";
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
  send_image: {},
  send_file: {},
};
