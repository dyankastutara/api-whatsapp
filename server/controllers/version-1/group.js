const { initializeSocket } = require("../../wa-connection");
const { removeSuffixID } = require("../../helpers/regex");
const moment = require("moment-timezone");
//DB
const Group = require("../../models/mongodb/group");

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
        await socket.waitForConnectionUpdate(
          ({ connection }) => connection === "open"
        );
        const groups = await socket.groupFetchAllParticipating();
        const user = await socket.user;
        finalResult.data = Object.values(groups).map((item) => ({
          id: item.id,
          subject: item.subject,
          size: item.size - 1,
          owner: item.owner,
          participants: item.participants
            .map((value) => ({
              ...value,
              name: "",
              phone_number: value.id.split("@")[0],
            }))
            .filter(
              (participant) => participant.id !== removeSuffixID(user?.id)
            ),
        }));
        finalResult.success = true;
        finalResult.message = "Berhasil ambil grup whatsapp";
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
        await socket.waitForConnectionUpdate(
          ({ connection }) => connection === "open"
        );
        const groupMetadata = await socket.groupMetadata(req.body.groupId);
        const user = await socket.user;
        finalResult.data = {
          ...groupMetadata,
          participants: groupMetadata.participants
            .map((item) => ({
              ...item,
              name: "",
              phone_number: item.id.split("@")[0],
            }))
            .filter(
              (participant) => participant.id !== removeSuffixID(user?.id)
            ),
        };
        finalResult.success = true;
        finalResult.message = "Berhasil ambil grup whatsapp";
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
        success: false,
        message: "",
      };
      try {
        const response = await Group.find({
          user: req.decoded.id,
          deleted: false,
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
    sync_with_ids: async (req, res) => {
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
        await socket.waitForConnectionUpdate(
          ({ connection }) => connection === "open"
        );
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
              }))
              .filter(
                (participant) => participant.id !== removeSuffixID(user?.id)
              ),
          }))
          .filter((group) => groupIds.includes(group.gid));
        if (data.length === 0) {
          const error = new Error("Data Group tidak ditemukan");
          error.status = 404;
          throw error;
        }
        await Group.insertMany(data);
        finalResult.data = data;
        finalResult.success = true;
        finalResult.message = "Berhasil tambah data dari grup whatsapp";
        res.status(200).json(finalResult);
      } catch (e) {
        const status = e.status || 500;
        finalResult.message = e.message || "Internal server error";
        res.status(status).json(finalResult);
      }
    },
    import: async (req, res) => {},
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
        const participants = Find.participants.concat(different_data);
        const Update = await Group.findOneAndUpdate(
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
            `Hapus kontak gagal. Kontak dengan id ${
              req.body.phone_number + "@s.whatsapp.net"
            } tidak ditemukan`
          );
          error.status = 404;
          throw error;
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
        const status = e.status || 500;
        finalResult.message = e.message || "Internal server error";
        res.status(status).json(finalResult);
      }
    },
  },
};
