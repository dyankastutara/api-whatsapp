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

const deleteCreds = async (folder_path) => {
  try {
    if (fs.existsSync(folder_path)) {
      await fs.rmSync(folder_path, { recursive: true, force: true });
      console.log("Session deleted and credentials removed.");
    }
  } catch (err) {
    console.error("Error while deleting credentials folder:", err);
  }
};

async function connectWhatsapp(sessionId) {
  let tmp_session = sessionId;
  const sessionsFolder = path.join(__dirname, `../sessions/${tmp_session}`);
  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionsFolder);
    const socket = await makeWASocket({
      auth: state,
      logger: pino({ level: "silent" }),
    });
    return new Promise((resolve, reject) => {
      // Event saat QR code tersedia
      socket.ev.on("connection.update", async (update) => {
        const { qr, connection, lastDisconnect, isNewLogin } = update;
        if (qr) {
          try {
            qrterminal.generate(qr, { small: true });
            const qrImage = await qrcode.toDataURL(qr);
            resolve({ qrImage, socket });
          } catch (err) {
            reject(err);
          }
        }

        if (connection === "connecting") {
          console.log("WhatsApp Connecting", tmp_session);
        }

        if (connection === "open") {
          try {
            const phoneNumber = socket.user?.id?.split("@")[0]?.split(":")[0];
            tmp_session = "sid_" + phoneNumber;
            const newSessionFolder = path.join(
              __dirname,
              `../sessions/${tmp_session}`
            );
            if (sessionsFolder !== newSessionFolder) {
              if (fs.existsSync(newSessionFolder)) {
                await connectWhatsapp(tmp_session); // Coba untuk reconnect jika tidak logout
              } else {
                await fs.renameSync(sessionsFolder, newSessionFolder); // Ubah nama folder sesi
                console.log(`Session folder renamed to: ${newSessionFolder}`);
                await socket.ev.removeAllListeners();
                await socket.end();
                await connectWhatsapp(tmp_session); // Coba untuk reconnect jika tidak logout
              }
            }
          } catch (err) {
            console.log("Handle error connection open", err);
          }
        }
        if (connection === "close") {
          console.log("WhatsApp disconnected", tmp_session);
          try {
            const reasonStatus = lastDisconnect.error?.output?.statusCode;
            const shouldReconnect = reasonStatus !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
              // await connectWhatsapp(tmp_session); // Coba untuk reconnect jika tidak logout
            } else {
              if (fs.existsSync(sessionsFolder)) {
                console.log("Loading existing credentials from session...");
                await deleteCreds(sessionsFolder);
                await Session.findOneAndDelete({ sessionId: tmp_session });
              }
              reject(shouldReconnect);
            }
          } catch (err) {
            console.log("Handle Error connection close");
          }
        }
      });

      // Event ketika ada perubahan autentikasi
      socket.ev.on("creds.update", async (creds) => {
        try {
          await saveSession(tmp_session, creds);
          await saveCreds();
        } catch (err) {
          console.log("creds.update Error: ", err);
        }
      });
    });
  } catch (err) {
    console.log(err);
  }
}

module.exports = { connectWhatsapp, getSession, saveSession };
