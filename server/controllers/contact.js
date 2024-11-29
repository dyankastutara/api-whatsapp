const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  makeInMemoryStore,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
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
  check: async (req, res) => {
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
            const phone_number = req.body.phone_no + "@s.whatsapp.net";
            finalResult.data = await socket.fetchStatus(phone_number);
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
  get: {
    groups: async (req, res) => {
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
    participants: async (req, res) => {
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
    personal: async (req, res) => {
      try {
        const socket = await initializeSocket(req.params.sessionId);
        socket.ev.on("connection.update", (update) => {
          const { connection, lastDisconnect } = update;
          if (connection === "close") {
            console.error("Koneksi terputus:", lastDisconnect?.error?.message);
          } else if (connection === "open") {
            console.log("Koneksi berhasil!");
          }
        });
        socket.ev.on("error", (e) => {
          console.error("Terjadi kesalahan:", e);
          const error = new Error(e.message);
          error.status = e.statusCode;
          throw error;
        });
        // Tunggu sampai QR code dipindai, jika sesi baru
        console.log("Menunggu koneksi ke WhatsApp...");
        // Ambil grup setelah koneksi sukses
        socket.ev.on("connection.update", async (update) => {
          if (update.connection === "open") {
            try {
              // const chats = await socket.fetchMessageHistory();
              // console.log("Message History", chats);
              // Ambil semua grup
              // const groups = await socket.groupFetchAllParticipating();
              // console.log("Daftar Grup WhatsApp:");
              // for (const groupId in groups) {
              //   const group = groups[groupId];
              //   console.log(`Nama Grup: ${group.subject}, ID Grup: ${groupId}`);

              //   // Ambil peserta dari grup
              //   const groupMetadata = await socket.groupMetadata(groupId);
              //   const participants = groupMetadata.participants;

              //   console.log(`Peserta dalam grup ${group.subject}:`);
              //   await participants.forEach((participant) => {
              //     console.log(
              //       `ID: ${participant.id}, Admin: ${
              //         participant.admin ? "Ya" : "Tidak"
              //       }`
              //     );
              //   });
              // }
              socket.ev.on("contacts.upsert", (contacts) => {
                console.log("Daftar Kontak:", contacts);
              });
            } catch (error) {
              console.error(
                "Gagal mengambil grup atau metadata:",
                error.message
              );
            }
          }
        });
        res.send([]);
      } catch (e) {
        console.log(e);
        res.send([]);
      }
    },
  },
};
