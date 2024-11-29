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
// DB
const Session = require("./models/whatsapp-session");
async function getSession(sessionId) {
  return await Session.findOne({ sessionId });
}
async function saveSession(sessionId, creds) {
  try {
    let session = await getSession(sessionId);

    if (!session) {
      session = new Session({ sessionId, creds });
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
    if (fs.lstatSync(sessionPath).isDirectory()) {
      // await connectWhatsApp(sessionPath, sessionId);
    }
  }
}
async function initializeSocket(sessionId) {
  const sessionsFolder = path.join(__dirname, `../sessions/${sessionId}`);
  console.log(sessionsFolder);
  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionsFolder);
    const socket = await makeWASocket({
      auth: state,
      logger: pino({ level: "silent" }),
    });
    await socket.ev.on("creds.update", saveCreds);
    return socket;
  } catch (err) {
    return err;
    console.log("Error Start Session");
  }
}
// Fungsi untuk menghubungkan sesi WhatsApp
async function connectWhatsApp(sessionPath, sessionId) {
  const socket = await initializeSocket(sessionId);
  socket.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "open") {
      console.log(`Init Existing Sessions WhatsApp connected for ${sessionId}`);
      await saveCreds();
    }

    if (connection === "close") {
      console.log(
        `Init Existing Sessions WhatsApp disconnected for ${sessionId}`
      );
      try {
        const reasonStatus = lastDisconnect.error?.output?.statusCode;
        const shouldReconnect = reasonStatus !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
          connectWhatsApp(sessionPath, sessionId);
        } else {
          if (fs.existsSync(sessionsFolder)) {
            console.log("Delete existing credentials from session...");
            await deleteCreds(sessionsFolder);
            await Session.findOneAndDelete({ sessionId: tmp_session });
          }
        }
      } catch (err) {
        console.log("Handle Error connection close");
      }
    }
  });
}

async function startSession(sessionId) {
  try {
    const socket = await initializeSocket(sessionId);
    return new Promise(async (resolve, reject) => {
      // Event saat QR code tersedia
      await socket.ev.on("connection.update", async (update) => {
        const { qr, connection, lastDisconnect, isNewLogin } = update;
        if (qr) {
          try {
            qrterminal.generate(qr, { small: true });
            const qrImage = await qrcode.toDataURL(qr);
            resolve({ qrImage, socket });
          } catch (err) {
            reject(err);
          }
        } else if (connection === "connecting") {
          console.log("WhatsApp Connecting", sessionId);
        } else if (connection === "open") {
          console.log(`WhatsApp Open  ${sessionId}`);
        } else if (lastDisconnect) {
          console.log("WhatsApp disconnected", sessionId);
          try {
            const reasonStatus = lastDisconnect.error?.output?.statusCode;
            const shouldReconnect = reasonStatus !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
              await startSession(sessionId); // Coba untuk reconnect jika tidak logout
            } else {
              if (fs.existsSync(sessionsFolder)) {
                await deleteCreds(sessionsFolder);
                await Session.findOneAndDelete({ sessionId: sessionId });
              }
              reject(shouldReconnect);
            }
          } catch (err) {
            console.log("Handle Error connection close");
          }
        }
      });

      // Event ketika ada perubahan autentikasi
      await socket.ev.on("creds.update", async (creds) => {
        try {
          await saveSession(sessionId, creds);
          await saveCreds();
        } catch (err) {
          console.log("creds.update Error: ", err);
        }
      });
      await socket.logout();
    });
  } catch (err) {
    console.log("Error Start Session");
  }
}
async function deleteCreds(folder_path) {
  try {
    if (fs.existsSync(folder_path)) {
      await fs.rmSync(folder_path, { recursive: true, force: true });
      console.log("Session deleted and credentials removed.");
    }
  } catch (err) {
    console.error("Error while deleting credentials folder:", err);
  }
}
async function endSession(sessionId) {
  try {
    const socket = await initializeSocket(sessionId);
    return new Promise(async (resolve, reject) => {
      // Event saat QR code tersedia
      await socket.ev.on("connection.update", async (update) => {
        const { connection } = update;
        if (connection === "close") {
          console.log("Connection closed End Session");
          const sessionPath = path.join(sessionsFolder, sessionId);
          await Session.findOneAndDelete({ sessionId: sessionId });
          await deleteCreds(sessionPath);
        }
      });
      await socket.ev.on("creds.update", async (creds) => {
        try {
          await saveSession(sessionId, creds);
          await saveCreds();
        } catch (err) {}
      });
      if (socket) {
        await resolve({ socket, success: true, message: "Berhasil Logout" });
      } else {
        throw new Error("Gagal Logout");
      }
    });
  } catch (err) {
    return {
      success: false,
      message: err?.response?.message,
    };
  }
}
module.exports = {
  initExistingSessions,
  getSession,
  saveSession,
  startSession,
  endSession,
  initializeSocket,
};
