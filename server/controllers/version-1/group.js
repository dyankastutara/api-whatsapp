const { initializeSocket } = require("../../wa-connection");
const { removeSuffixID } = require("../../helpers/regex");
const moment = require("moment-timezone");
//DB
const Group = require("../../models/mongodb/group");
const Contact = require("../../models/mongodb/contact");

module.exports = {
  grabber: {
    groups: async (req, res) => {
      let finalResult = {
        data: [],
        success: false,
        message: "",
      };
      try {
        const sessionId = req.body.sessionId;
        const socket = await initializeSocket(sessionId);
        if (socket.error) {
          const error = new Error(socket.message);
          error.status = 300;
          throw error;
        }
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
              finalResult.data = Object.values(groups)
                .filter((item) => !item.announce)
                .map((item) => ({
                  ...item,
                  id: item.id,
                  subject: item.subject,
                  size: item.size - 1,
                  owner: item.owner,
                  participants: item.participants
                    .map((value) => ({
                      ...value,
                      name: "",
                      subscribed: true,
                      phone_number: value.id.split("@")[0],
                    }))
                    .filter(
                      (participant) =>
                        participant.id !== removeSuffixID(user?.id)
                    ),
                }));
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
    participant: async (req, res) => {
      let finalResult = {
        data: {},
        success: false,
        message: "",
      };
      try {
        const sessionId = req.body.sessionId;
        const socket = await initializeSocket(sessionId);
        if (socket.error) {
          const error = new Error(socket.message);
          error.status = 300;
          throw error;
        }
        await new Promise(async (resolve, reject) => {
          await socket.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === "close") {
              const error = new Error(lastDisconnect?.error?.message);
              error.status = lastDisconnect?.error?.statusCode;
              reject(error);
            } else if (connection === "open") {
              const groupMetadata = await socket.groupMetadata(
                req.body.groupId
              );
              const user = await socket.user;
              finalResult.data = {
                ...groupMetadata,
                participants: groupMetadata.participants
                  .map((item) => ({
                    ...item,
                    name: "",
                    subscribed: true,
                    phone_number: item.id.split("@")[0],
                  }))
                  .filter(
                    (participant) => participant.id !== removeSuffixID(user?.id)
                  ),
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
  get: {
    all: async (req, res) => {
      let finalResult = {
        data: [],
        currentPage: 0,
        totalPages: 0,
        totalDocuments: 0,
        success: false,
        message: "",
      };
      try {
        const { page, limit, search } = req.query;
        const isPaginationEnabled = page && limit;
        let query = {};
        let paginatedData;
        // Jika filter nama diberikan, gunakan regex untuk mencari nama mendekati
        if (search) {
          const keywords = search.split(" "); // Pecah nama menjadi kata-kata
          query.subject = {
            $regex: keywords.map((word) => `(?=.*${word})`).join(""), // Gabungkan regex untuk setiap kata
            $options: "i", // Case-insensitive
          };
        }
        if (isPaginationEnabled) {
          const currentPage = parseInt(page) || 1;
          const perPage = parseInt(limit) || 10;
          const skip = (currentPage - 1) * perPage;
          paginatedData = await Group.find({
            user: req.decoded.id,
            $or: [{ deleted: false }, { deleted: { $exists: false } }],
            ...query,
          })
            .sort({
              updated_at: -1,
            })
            .skip(skip)
            .limit(perPage);
        } else {
          paginatedData = await Group.find({
            user: req.decoded.id,
            $or: [{ deleted: false }, { deleted: { $exists: false } }],
            ...query,
          }).sort({
            updated_at: -1,
          });
        }
        const totalDocuments = await Group.countDocuments({
          user: req.decoded.id,
          deleted: false,
          ...query,
        });
        finalResult.data = paginatedData;
        finalResult.currentPage = isPaginationEnabled
          ? parseInt(page) || 1
          : null;
        finalResult.totalPages = isPaginationEnabled
          ? Math.ceil(totalDocuments / (parseInt(limit) || 10))
          : null;
        finalResult.totalDocuments = totalDocuments;
        finalResult.success = true;
        finalResult.message = "Berhasil ambil data grup";
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
        const response = await Group.findOne({
          _id: req.params.id,
        });
        finalResult.data = response;
        finalResult.success = true;
        finalResult.message = "Berhasil ambil data grup";
        res.status(200).json(finalResult);
      } catch (e) {
        const status = e.status || 500;
        finalResult.message = e.message || "Internal server error";
        res.status(status).json(finalResult);
      }
    },
  },
  add: {
    new: async (req, res) => {
      let finalResult = {
        data: {},
        success: false,
        message: "",
      };
      try {
        const { subject, owner } = req.body;
        const response = await Group.create({
          subject,
          owner,
          participants: [],
          user: req.decoded.id,
        });
        finalResult.data = response._doc;
        finalResult.success = true;
        finalResult.message = "Group berhasil dibuat";
        res.status(200).json(finalResult);
      } catch (e) {
        const status = e.status || 500;
        finalResult.message = e.message || "Internal server error";
        res.status(status).json(finalResult);
      }
    },
    with_contacts: async (req, res) => {
      let finalResult = {
        data: {},
        success: false,
        message: "",
      };
      try {
        const { data, subject } = req.body;
        const participants = data.map((item) => ({
          ...item,
          subscribed: true,
          id: item.phone_number + "@s.whatsapp.net",
        }));
        const CreateGroup = await Group.create({
          subject,
          participants,
          user: req.decoded.id,
        });
        await Contact.insertMany(
          participants.map((item) => ({
            jid: item.id,
            name: item.name,
            phone_number: item.phone_number,
            group: CreateGroup._id,
          }))
        );
        finalResult.data = CreateGroup;
        finalResult.success = true;
        finalResult.message = `Group ${CreateGroup.subject} berhasil ditambahkan`;
        res.status(200).json(finalResult);
      } catch (e) {
        const status = e.status || 500;
        finalResult.message = e.message || "Internal server error";
        res.status(status).json(finalResult);
      }
    },
    sync_with_group_ids: async (req, res) => {
      let finalResult = {
        data: [],
        success: false,
        message: "",
      };
      try {
        const { sessionId, groupIds } = req.body;
        const socket = await initializeSocket(sessionId);
        if (socket.error) {
          const error = new Error(socket.message);
          error.status = 300;
          throw error;
        }
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
              const data = await Object.values(groups)
                .map((item) => ({
                  gid: item.id,
                  subject: item.subject,
                  owner: item.owner,
                  user: req.decoded.id,
                  participants: item.participants
                    .map((participant) => ({
                      id: participant.id,
                      name: "",
                      phone_number: participant.id.split("@")[0],
                      subscribed: true,
                    }))
                    .filter(
                      (participant) =>
                        participant.id !== removeSuffixID(user?.id)
                    ),
                }))
                .filter((group) => groupIds.includes(group.gid));
              if (data.length === 0) {
                const error = new Error("Data Group tidak ditemukan");
                error.status = 404;
                reject(error);
              }
              const results = await Group.insertMany(data);
              await Contact.insertMany(
                results.flatMap((group) =>
                  group.participants.map((item) => ({
                    jid: item.id,
                    name: item.name,
                    phone_number: item.phone_number,
                    group: group._id,
                  }))
                )
              );
              finalResult.data = results;
              finalResult.success = true;
              finalResult.message = "Berhasil tambah data dari grup whatsapp";
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
    contacts: async (req, res) => {
      let finalResult = {
        data: [],
        success: false,
        message: "",
      };
      try {
        const { data } = req.body;
        const Find = await Group.findOne({
          _id: req.params.id,
        });
        const new_data = data.map((item) => ({
          ...item,
          id: item.phone_number + "@s.whatsapp.net",
        }));
        const same_data = Find.participants.filter((item) =>
          new_data.some((val) => item.id === val.id)
        );
        const different_data = new_data.filter(
          (item) => !same_data.some((val) => item.id === val.id)
        );
        await Contact.insertMany(
          different_data.map((item) => ({
            jid: item.id,
            name: item.name,
            phone_number: item.phone_number,
            group: req.params.id,
          }))
        );
        const participants = Find.participants.concat(different_data);
        await Group.findOneAndUpdate(
          {
            _id: req.params.id,
          },
          {
            participants,
          }
        );
        const contacts_added_length = different_data.length;
        finalResult.data = different_data;
        finalResult.success = true;
        finalResult.message = `${contacts_added_length} nomor berhasil ditambahkan ke daftar kontak`;
        res.status(200).json(finalResult);
      } catch (e) {
        const status = e.status || 500;
        finalResult.message = e.message || "Internal server error";
        res.status(status).json(finalResult);
      }
    },
  },
  update: {
    by_id: async (req, res) => {
      let finalResult = {
        data: {},
        success: false,
        message: "",
      };
      try {
        const group = await Group.findOne({
          _id: req.params.id,
        });
        if (!group) {
          const error = new Error(
            "Dokumen gagal dibuah. Dokumen tidak ditemukan"
          );
          error.status = 404;
          throw error;
        }
        group.subject = req.body.subject || group.subject;
        await group.save();
        finalResult.data = group;
        finalResult.success = true;
        finalResult.message = "Berhasil ubah group";
        res.status(200).json(finalResult);
      } catch (e) {
        const status = e.status || 500;
        finalResult.message = e.message || "Internal server error";
        res.status(status).json(finalResult);
      }
    },
    contact: async (req, res) => {
      let finalResult = {
        data: {},
        success: false,
        message: "",
      };
      try {
        const group = await Group.findOne({
          _id: req.params.id,
        });
        if (!group) {
          const error = new Error("Dokumen tidak ditemukan");
          error.status = 404;
          throw error;
        }
        const check_participant = group.participants.find(
          (participant) => participant.id === req.params.contact_id
        );
        if (!check_participant) {
          const error = new Error(
            `Ubah kontak gagal. Kontak dengan id ${
              req.body.phone_number + "@s.whatsapp.net"
            } tidak ditemukan`
          );
          error.status = 404;
          throw error;
        }
        const tmp_participants = group.participants.map((participant) =>
          participant.id === req.params.contact_id
            ? {
                ...participant,
                phone_number: req.body.phone_number || participant.phone_number,
                name: req.body.name || participant.name,
                id: req.body.phone_number + "@s.whatsapp.net" || participant.id,
              }
            : participant
        );
        group.participants = tmp_participants;
        await group.save();
        finalResult.data = group;
        finalResult.success = true;
        finalResult.message = "Berhasil ubah kontak";
        res.status(200).json(finalResult);
      } catch (e) {
        const status = e.status || 500;
        finalResult.message = e.message || "Internal server error";
        res.status(status).json(finalResult);
      }
    },
  },
  delete: {
    by_id: async (req, res) => {
      let finalResult = {
        id: "",
        success: false,
        message: "",
      };
      try {
        const group = await Group.findOne({
          _id: req.params.id,
        });
        if (!group) {
          const error = new Error(
            "Dokumen gagal dihapus. Dokumen tidak ditemukan"
          );
          error.status = 404;
          throw error;
        }
        group.deleted = true;
        group.deleted_at = moment().tz("Asia/Jakarta");
        await group.save();
        const contacts = await Contact.find({
          group: group._id,
        });
        for (let contact of contacts) {
          if (contact) {
            contact.deleted = true;
            contact.deleted_at = moment().tz("Asia/Jakarta");
            await contact.save();
          }
        }
        finalResult.id = group.id;
        finalResult.success = true;
        finalResult.message = "Berhasil hapus group";
        res.status(200).json(finalResult);
      } catch (e) {
        const status = e.status || 500;
        finalResult.message = e.message || "Internal server error";
        res.status(status).json(finalResult);
      }
    },
    multiple_ids: async (req, res) => {
      const finalResult = {
        ids: [],
        success: false,
        message: "",
      };
      try {
        const groups = await Group.find({
          _id: { $in: req.body.ids },
          $or: [{ deleted: false }, { deleted: { $exists: false } }],
        });
        if (groups.length === 0) {
          const error = new Error("Group WhatsApp tidak ditemukan");
          error.status = 404;
          throw error;
        }
        for (let group of groups) {
          group.deleted = true;
          group.deleted_at = moment().tz("Asia/Jakarta");
          await group.save();
        }
        const contacts = await Contact.find({
          group: { $in: req.body.ids },
        });
        for (let contact of contacts) {
          if (contact) {
            contact.deleted = true;
            contact.deleted_at = moment().tz("Asia/Jakarta");
            await contact.save();
          }
        }
        const deleted_ids = groups.map((item) => item._id);
        finalResult.ids = deleted_ids;
        finalResult.success = true;
        finalResult.message = `${deleted_ids.length} group berhasil dihapus`;
        res.status(200).json(finalResult);
      } catch (e) {
        const status = e.status || 500;
        finalResult.message = e.message || "Internal server error";
        res.status(status).json(finalResult);
      }
    },
    participant: async (req, res) => {
      let finalResult = {
        data: {},
        success: false,
        message: "",
      };
      try {
        const group = await Group.findOne({
          _id: req.params.id,
        });
        if (!group) {
          const error = new Error("Dokumen tidak ditemukan");
          error.status = 404;
          throw error;
        }
        const check_participant = group.participants.find(
          (participant) => participant.id === req.params.contact_id
        );
        if (!check_participant) {
          const error = new Error(
            `Hapus kontak gagal. Kontak dengan id ${
              req.body.phone_number + "@s.whatsapp.net"
            } tidak ditemukan`
          );
          error.status = 404;
          throw error;
        }
        const contact = await Contact.findOne({
          jid: req.params.contact_id,
          group: req.params.id,
          deleted: false,
        });
        if (contact) {
          contact.deleted = true;
          contact.deleted_at = moment().tz("Asia/Jakarta");
          await contact.save();
        }

        const tmp_participants = group.participants.filter(
          (item) => item.id !== req.params.contact_id
        );
        group.participants = tmp_participants;
        await group.save();
        finalResult.data = group;
        finalResult.success = true;
        finalResult.message = "Berhasil hapus kontak";
        res.status(200).json(finalResult);
      } catch (e) {
        console.log(e);
        const status = e.status || 500;
        finalResult.message = e.message || "Internal server error";
        res.status(status).json(finalResult);
      }
    },
    multiple_participants_ids: async (req, res) => {
      let finalResult = {
        data: {},
        success: false,
        message: "",
      };
      try {
        const group = await Group.findOne({
          _id: req.params.id,
        });
        if (!group) {
          const error = new Error("Dokumen tidak ditemukan");
          error.status = 404;
          throw error;
        }
        const check_participant = group.participants.find((participant) =>
          req.body.participant_ids.includes(participant.id)
        );
        if (!check_participant) {
          const error = new Error(`Hapus kontak gagal. Kontak tidak ditemukan`);
          error.status = 404;
          throw error;
        }
        const contacts = await Contact.find({
          jid: { $in: req.body.participant_ids },
          group: req.params.id,
          $or: [{ deleted: false }, { deleted: { $exists: false } }],
        });
        for (let contact of contacts) {
          if (contact) {
            contact.deleted = true;
            contact.deleted_at = moment().tz("Asia/Jakarta");
            await contact.save();
          }
        }
        const tmp_participants = group.participants.filter(
          (item) => !req.body.participant_ids.includes(item.id)
        );
        group.participants = tmp_participants;
        await group.save();
        finalResult.data = group;
        finalResult.success = true;
        finalResult.message = `${req.body.participant_ids.length} kontak berhasil dihapus`;
        res.status(200).json(finalResult);
      } catch (e) {
        const status = e.status || 500;
        finalResult.message = e.message || "Internal server error";
        res.status(status).json(finalResult);
      }
    },
  },
};
