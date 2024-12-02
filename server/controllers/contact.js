const path = require("path");
const { initializeSocket } = require("../connection");

async function initializeStore(sessionId) {
  const folderPath = path.join(__dirname, "../../store");
  const filePath = path.join(folderPath, `${sessionId}.json`);
  // Pastikan folder ada
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  return filePath;
}

module.exports = {
  check: {
    phone_number: async (req, res) => {
      let finalResult = {
        data: {
          exists: false,
        },
        success: false,
        message: "",
      };
      try {
        const sessionId = req.body.sessionId;
        const socket = await initializeSocket(sessionId);
        await new Promise(async (resolve, reject) => {
          await socket.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === "close") {
              const error = new Error(lastDisconnect?.error?.message);
              error.status = lastDisconnect?.error?.statusCode;
              reject(error);
            } else if (connection === "open") {
              const phone_number = req.body.phone_no + "@s.whatsapp.net";
              const result = await socket.onWhatsApp(phone_number);
              if (result.length > 0) {
                finalResult.data = result ? result[0] : {};
                finalResult.message = "Nomor ini telah terdaftar di WhatsApp";
              } else {
                finalResult.success = true;
                finalResult.message =
                  "Oops! Nomor ini tidak terdaftar di WhatsApp";
              }
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
