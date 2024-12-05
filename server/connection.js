const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require("@whiskeysockets/baileys");
const qrterminal = require("qrcode-terminal");
const qrcode = require("qrcode");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const { removeSuffixID } = require("./helpers/regex");
// DB
const Session = require("./models/mongodb/session");
const Account = require("./models/mongodb/account");
const TmpSession = require("./models/mongodb/tmp_session");

async function getSession(sessionId) {
  return await Session.findOne({ session_id: sessionId });
}
async function saveSession(sessionId, creds) {
  try {
    let session = await getSession(sessionId);

    if (!session) {
      session = new Session({ session_id: sessionId, creds });
    } else {
      session.creds = creds;
    }

    return await session.save();
  } catch (err) {}
}
// Session Folder
const sessionsFolder = path.join(__dirname, "../sessions");
// Fungsi untuk inisialisasi ulang sesi dari folder yang ada
async function initExistingSessions() {
  const folders_name = fs.readdirSync(sessionsFolder);
  for (const sessionId of folders_name) {
    const sessionPath = path.join(sessionsFolder, sessionId);
    if (sessionId && fs.lstatSync(sessionPath).isDirectory()) {
      await initializeSocket(sessionId);
    }
  }
}
async function initializeSocket(sessionId) {
  const sessionPath = path.join(__dirname, `../sessions/${sessionId}`);
  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const socket = await makeWASocket({
      auth: state,
      logger: pino({ level: "silent" }),
    });

    await socket.ev.on("creds.update", async (creds) => {
      try {
        await saveSession(sessionId, creds);
        await saveCreds();
      } catch (err) {
        console.log("creds.update Error: ", err);
      }
    });
    await socket.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === "open") {
        const tmp = await TmpSession.findOne({
          session_id: sessionId,
        });
        if (tmp) {
          const user = await socket.user;
          const obj = {
            jid: removeSuffixID(user.id),
            phone_number: user.id.split(":")[0],
            name: "",
            status: "connected",
            connected_at: new Date(),
            type: tmp?.type || "",
            user_id: tmp?.user_id,
            user: {
              id: tmp?.user_id,
            },
          };
          const account = await Account.create(obj);
          await Session.findOneAndUpdate(
            {
              session_id: sessionId,
            },
            {
              last_active: new Date(),
              account: account._doc._id,
            }
          );
          await TmpSession.findOneAndDelete({
            session_id: sessionId,
          });
        } else {
          const session = await Session.findOne({
            session_id: sessionId,
          });
          if (session) {
            await Account.findOneAndUpdate(
              {
                _id: session.account,
              },
              {
                status: "connected",
                connected_at: new Date(),
              }
            );
            await Session.findOneAndUpdate(
              {
                session_id: sessionId,
              },
              {
                last_active: new Date(),
              }
            );
          }
        }
      }
      if (lastDisconnect) {
        const reasonStatus = lastDisconnect.error?.output?.statusCode;
        const loggedOut = reasonStatus === DisconnectReason.loggedOut;
        if (loggedOut) {
          const session = await Session.findOne({
            session_id: sessionId,
          });
          await Account.findOneAndUpdate(
            {
              _id: session.account,
            },
            {
              status: "disconnected",
              connected_at: null,
            }
          );
          if (fs.existsSync(sessionPath)) {
            const { error, message } = await deleteCreds(sessionPath);
            if (error) {
              throw new Error(message);
            }
          }
          console.log("Logged Out", sessionId);
        }
      }
    });
    return socket;
  } catch (err) {
    console.log(error.message || "Error initialize Socket");
    return err;
  }
}

async function startSession(sessionId) {
  let finalResult = {
    qrImage: "",
    error: false,
    success: false,
    message: "",
  };
  try {
    const socket = await initializeSocket(sessionId);
    return new Promise(async (resolve, reject) => {
      // Event saat QR code tersedia
      await socket.ev.on("connection.update", async (update) => {
        const { qr, lastDisconnect, isNewLogin } = update;
        if (qr) {
          try {
            qrterminal.generate(qr, { small: true });
            const qrImage = await qrcode.toDataURL(qr);
            finalResult.qrImage = qrImage;
            finalResult.success = true;
            finalResult.message = "QR Code berhasil dibuat untuk session";
            resolve(finalResult);
          } catch (err) {
            reject(err);
          }
        } else if (lastDisconnect) {
          const reasonStatus = lastDisconnect.error?.output?.statusCode;
          const shouldReconnect = reasonStatus !== DisconnectReason.loggedOut;
          if (shouldReconnect) {
            await startSession(sessionId); // Coba untuk reconnect jika tidak logout
          }
        }
      });
    });
  } catch (err) {
    console.log("Error Start Session");
    finalResult.error = true;
    finalResult.message = "QR Code gagal dibuat untuk session";
    resolve(finalResult);
  }
}
async function endSession(sessionId) {
  let finalResult = {
    error: false,
    success: false,
    message: "",
  };
  try {
    const socket = await initializeSocket(sessionId);
    return new Promise(async (resolve, reject) => {
      // Event saat QR code tersedia
      await socket.ev.on("connection.update", async (update) => {
        const { connection } = update;
        if (connection === "open") {
          const session = await Session.findOne({ session_id: sessionId });
          await Account.findOneAndUpdate(
            {
              _id: session.account,
            },
            {
              status: "disconnect",
              connected_at: null,
            }
          );
          await socket.logout();
        }
      });
      await socket.ev.on("error", (e) => {
        const error = new Error(e.message);
        error.status = e.statusCode;
        reject(error);
      });
      finalResult.success = true;
      finalResult.message = "Sesi Anda telah diakhiri. Logout berhasil.";
      resolve(finalResult);
    });
  } catch (err) {
    finalResult.error = true;
    finalResult.message = "Sesi Anda gagal diakhiri.";
    resolve(finalResult);
  }
}
async function deleteCreds(folder_path) {
  let finalResult = {
    success: false,
    error: false,
    message: "",
  };
  try {
    if (fs.existsSync(folder_path)) {
      await fs.rmSync(folder_path, { recursive: true, force: true });
      console.log("Session deleted and credentials removed.");
      finalResult.success = true;
      finalResult.message = "Session deleted and credentials removed.";
      return finalResult;
    }
  } catch (err) {
    console.error("Error while deleting credentials folder:", err);
    finalResult.error = true;
    finalResult.message = "Error while deleting credentials";
    return finalResult;
  }
}
module.exports = {
  initExistingSessions,
  startSession,
  endSession,
  initializeSocket,
  sessionsFolder,
  deleteCreds,
};
