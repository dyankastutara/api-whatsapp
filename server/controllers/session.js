const fs = require("fs");
const path = require("path");
const qrcode = require("qrcode");

const {
  sessionsFolder,
  initializeSocket,
  startSession,
  endSession,
} = require("../connection");

function createSessionId() {
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 1000);
  return `session_${timestamp}_${randomSuffix}`;
}
// Fungsi untuk cek dan membuat folder sesi
async function checkSessionId(sessionId) {
  const sessionPath = path.join(sessionsFolder, sessionId);
  if (fs.existsSync(sessionPath)) {
    return sessionId;
  } else {
    const id = await createSessionId();
    const newSessionPath = await path.join(sessionsFolder, id);
    fs.mkdirSync(newSessionPath);
    return id;
  }
}
module.exports = {
  create: {
    session: async (req, res) => {
      const finalResult = {
        sessionId: "",
        qrImage: "",
        success: false,
        message: "",
      };
      try {
        const id = await createSessionId();
        const sessionId = await checkSessionId(id);
        const { qrImage } = await startSession(sessionId);
        finalResult.sessionId = sessionId;
        finalResult.qrImage = qrImage;
        finalResult.success = true;
        finalResult.message = "Session berhasil dibuat";
        res.status(200).json(finalResult);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to start session", error });
      }
    },
  },
  check: {
    status: async (req, res) => {
      let finalResult = {
        status: "",
        connected: false,
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
              const error = new Error("Not Active");
              error.status = lastDisconnect?.error?.statusCode;
              reject(error);
            } else if (connection === "open") {
              finalResult.status = "Active";
              finalResult.connected = true;
              finalResult.success = true;
              finalResult.message = "Berhasil cek status session";
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
  connect: async (req, res) => {
    const finalResult = {
      sessionId: "",
      qrImage: "",
      success: false,
      message: "",
    };
    try {
      const sessionId = req.body.sessionId;
      const socket = await initializeSocket(sessionId);
      await new Promise(async (resolve, reject) => {
        await socket.ev.on("connection.update", async (update) => {
          const { qr } = update;
          if (qr) {
            try {
              const qrImage = await qrcode.toDataURL(qr);
              finalResult.sessionId = sessionId;
              finalResult.qrImage = qrImage;
              finalResult.success = true;
              finalResult.message = "Session berhasil dibuat";
              resolve(finalResult);
            } catch (err) {
              reject(err);
            }
          }
        });
        await socket.ev.on("error", (e) => {
          const error = new Error(e.message);
          error.status = e.statusCode;
          reject(error);
        });
      });
      res.status(200).json(finalResult);
    } catch (error) {
      const status = error.status || 500;
      finalResult.message = error.message || "Internal server error";
      res.status(status).json(finalResult);
    }
  },
  disconnect: async (req, res) => {
    const { sessionId } = req.body;
    try {
      const response = await endSession(sessionId);
      res.status(201).json({
        message: response.message,
        sessionId,
        success: response.success,
      });
    } catch (error) {
      console.error("Error Disconnect");
      res.status(500).json({ message: "Failed to start session", error });
    }
  },
};
