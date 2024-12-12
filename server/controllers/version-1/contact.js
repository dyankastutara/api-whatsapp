const path = require("path");
const { initializeSocket } = require("../../wa-connection");
const { removeSuffixID } = require("../../helpers/regex");
const Group = require("../../models/mongodb/group");

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
  count: async (req, res) => {
    let finalResult = {
      total: 0,
      success: false,
      message: "",
    };
    try {
      const groups = await Group.find({
        user: req.decoded.id,
        $or: [{ deleted: false }, { deleted: { $exists: false } }],
      });
      const contacts = await groups.flatMap((group) => group.participants);
      finalResult.total = contacts.length;
      finalResult.success = true;
      finalResult.message = "Berhasil mendapatkan data total kontak";
      res.status(200).json(finalResult);
    } catch (e) {
      const status = e.status || 500;
      finalResult.message = e.message || "Internal server error";
      res.status(status).json(finalResult);
    }
  },
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
                finalResult.success = true;
                finalResult.data = result ? result[0] : {};
                finalResult.message = "Nomor ini telah terdaftar di WhatsApp";
              } else {
                finalResult.success = false;
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
  grabber: {
    phone_number: async (req, res) => {
      let finalResult = {
        data: [],
        size: 0,
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
              const groups = await socket.groupFetchAllParticipating();
              const user = await socket.user;
              const data = Object.values(groups)
                .map((item) => ({
                  ...item,
                  participants: item.participants
                    .map((value) => ({
                      ...value,
                      name: "",
                      phone_number: value.id.split("@")[0],
                    }))
                    .filter(
                      (participant) =>
                        participant.id !== removeSuffixID(user?.id)
                    ),
                }))
                .reduce((acc, group) => {
                  return acc.concat(group.participants);
                }, []);
              finalResult.data = data;
              finalResult.size = data.length;
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
