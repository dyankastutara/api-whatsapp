const fs = require("fs");
const path = require("path");
const {
  sessionsFolder,
  initializeSocket,
  startSession,
  endSession,
} = require("../connection");
//DB
const TmpSession = require("../models/mongodb/tmp_session");
const Session = require("../models/mongodb/session");
const Account = require("../models/mongodb/account");

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
  create: async (req, res) => {
    let finalResult = {
      sessionId: "",
      qrImage: "",
      success: false,
      message: "",
    };
    try {
      const account = await Account.find({
        "user.id": req.decoded.id,
      });
      if (account.length >= 6) {
        const error = new Error(
          "Nomor WhatsApp Akun kamu sudah mencapai batas maksimal"
        );
        error.status = 200;
        throw error;
      }
      const id = await createSessionId();
      const sessionId = await checkSessionId(id);
      const { qrImage, error, message } = await startSession(sessionId);
      if (error) {
        const error = new Error(message);
        error.status = 500;
        throw error;
      }
      await TmpSession.create({
        session_id: sessionId,
        type: req.body.type,
        user_id: req.decoded.id,
      });
      finalResult.sessionId = sessionId;
      finalResult.qrImage = qrImage;
      finalResult.success = true;
      finalResult.message = "Session berhasil dibuat";
      res.status(200).json(finalResult);
    } catch (error) {
      const status = error.status || 500;
      finalResult.message = error.message || "Internal server error";
      res.status(status).json(finalResult);
    }
  },
  check: async (req, res) => {
    let finalResult = {
      status: "",
      connected: false,
      success: false,
      message: "",
    };
    try {
      const { sessionId } = req.body;
      const sessionPath = path.join(sessionsFolder, sessionId);
      if (!fs.existsSync(sessionPath)) {
        const session = await Session.findOne({
          session_id: sessionId,
        }).populate({
          path: "account",
        });
        if (session && session.account) {
          await Account.findOneAndUpdate(
            {
              _id: session.account,
            },
            {
              status: "disconnected",
              connected_at: null,
            }
          );
        }

        const error = new Error("Session tidak aktif");
        error.status = 404;
        throw error;
      }
      const socket = await initializeSocket(sessionId);
      await new Promise(async (resolve, reject) => {
        await socket.ev.on("connection.update", async (update) => {
          const { connection, lastDisconnect } = update;
          if (connection === "close") {
            const error = new Error("Not Active");
            error.status = lastDisconnect?.error?.statusCode;
            reject(error);
          } else if (connection === "open") {
            finalResult.status = "connected";
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
  connect: async (req, res) => {
    const finalResult = {
      sessionId: "",
      qrImage: "",
      success: false,
      message: "",
    };
    try {
      const { sessionId } = req.body;
      const session = await Session.findOne({
        session_id: sessionId,
      }).populate({
        path: "account",
      });
      if (!session || !session.account) {
        const error = new Error("Akun WhatsApp tidak ditemukan");
        error.status = 404;
        throw error;
      }
      const sessionPath = await path.join(sessionsFolder, sessionId);
      if (fs.existsSync(sessionPath)) {
        await fs.rmSync(sessionPath, { recursive: true, force: true });
      }
      const { qrImage, error, message } = await startSession(sessionId);
      if (error) {
        const error = new Error(message);
        error.status = 500;
        throw error;
      }
      finalResult.sessionId = sessionId;
      finalResult.qrImage = qrImage;
      finalResult.success = true;
      finalResult.message = "Session berhasil dibuat";
      res.status(200).json(finalResult);
    } catch (error) {
      const status = error.status || 500;
      finalResult.message = error.message || "Internal server error";
      res.status(status).json(finalResult);
    }
  },
  disconnect: async (req, res) => {
    let finalResult = {
      id: "",
      sessionId: "",
      success: false,
      message: "",
    };
    try {
      const { sessionId } = req.body;
      const session = await Session.findOne({
        session_id: sessionId,
      }).populate({
        path: "account",
        select: "jid",
      });
      if (!session || !session.account) {
        const error = new Error("Akun WhatsApp tidak ditemukan");
        error.status = 404;
        throw error;
      }
      const { error, message } = await endSession(sessionId);
      if (error) {
        const error = new Error(message);
        error.status = 404;
        throw error;
      }
      finalResult.id = req.body.id;
      finalResult.sessionId = sessionId;
      finalResult.success = true;
      finalResult.message = message;
      res.status(200).json(finalResult);
    } catch (error) {
      const status = error.status || 500;
      finalResult.message = error.message || "Internal server error";
      res.status(status).json(finalResult);
    }
  },
};
