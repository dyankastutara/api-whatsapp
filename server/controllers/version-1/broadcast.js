const moment = require("moment-timezone");

const Broadcast = require("../../models/mongodb/broadcast");
const Group = require("../../models/mongodb/group");
const Message = require("../../models/mongodb/message");

function timeToSend(obj) {
  let time_send = JSON.parse(obj || "{}");
  if (time_send.type === "immediately") {
    time_send = {
      type: "immediately",
      time: moment().tz("Asia/Jakarta"),
    };
  }
  if (time_send.type === "tonight_at_7pm") {
    time_send = {
      type: "tonight_at_7pm",
      time: moment().tz("Asia/Jakarta").set({
        hour: 19,
        minute: 0,
        second: 0,
        millisecond: 0,
      }),
    };
  }
  if (time_send.type === "tomorrow_at_10am") {
    time_send = {
      type: "tomorrow_at_10am",
      time: moment()
        .tz("Asia/Jakarta")
        .add(1, "day")
        .set({ hour: 10, minute: 0, second: 0, millisecond: 0 }),
    };
  }
  if (time_send.type === "custom") {
    time_send = {
      type: "custom",
      time: moment(obj.time).tz("Asia/Jakarta"),
    };
  }
  return time_send;
}
module.exports = {
  get: {
    all: async (req, res) => {
      let finalResult = {
        data: [],
        count: 0,
        success: false,
        message: "",
      };
      try {
        const { page, limit } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const totalDocument = await Broadcast.countDocuments({
          user: req.decoded.id,
        });
        const data = await Broadcast.find({
          user: req.decoded.id,
        })
          .skip(skip)
          .limit(parseInt(limit))
          .sort({ created_at: -1 });
        finalResult.count = totalDocument;
        finalResult.data = data;
        finalResult.success = true;
        finalResult.message = "Dokumen berhasil ditemukan";
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
        const data = await Broadcast.findOne({
          user: req.decoded.id,
          _id: req.params.id,
        }).populate({
          path: "senders.account", // Populate account dari senders
          populate: {
            path: "sessions",
            select: "session_id last_active",
          },
        });
        if (!data) {
          const error = new Error("Dokumen tidak ditemukan");
          error.status = 404;
          throw error;
        }
        finalResult.data = data;
        finalResult.success = true;
        finalResult.message = "Dokumen berhasil ditemukan";
        res.status(200).json(finalResult);
      } catch (e) {
        const status = e.status || 500;
        finalResult.message = e.message || "Internal server error";
        res.status(status).json(finalResult);
      }
    },
  },
  create: async (req, res) => {
    let finalResult = {
      data: {},
      success: false,
      message: "",
    };
    try {
      const {
        name,
        senders,
        groups,
        status,
        time_to_send,
        delay,
        rest_mode,
        perfect_timing,
      } = req.body;
      const contents = await new Promise((resolve, reject) => {
        const res = req.body.contents.map((content, index) => {
          let result = {
            message: "",
            spintax: [],
            interactive: [],
            url: "",
            mimetype: "",
            filename: "",
          };
          const file = req.files.find(
            (f) => f.fieldname === `contents[${index}][attachment]`
          );
          if (file) {
            const name = file.key.split("/");
            result.url = file.location;
            result.mimetype = file.mimetype;
            result.filename = name[name.length - 1];
          }

          result.spintax = content.spintax
            ? content.spintax.map((spintax, spintaxIndex) => {
                const message = spintax.message;
                return {
                  message: spintax.message,
                };
              })
            : [];
          result.message = content.message;
          result.interactive = content.interactive ? content.interactive : [];
          return result;
        });
        resolve(res);
      });
      const jsonBody = {
        bid: Date.now() + "@broadcast",
        name,
        senders: JSON.parse(senders || "[]"),
        groups: JSON.parse(groups || "[]"),
        contents,
        time_to_send: await timeToSend(time_to_send),
        delay: JSON.parse(delay || "{}"),
        rest_mode: JSON.parse(rest_mode || "{}"),
        perfect_timing: perfect_timing === "true",
        status,
      };
      const group_documents = await Group.find({
        _id: { $in: jsonBody.groups },
      });
      const create_broadcast = await Broadcast.create({
        ...jsonBody,
        user: req.decoded.id,
      });
      const participants = group_documents.flatMap((item) => item.participants);
      const messages = contents.flatMap((item) => {
        // Membuat array baru dengan message utama
        const messages = [
          {
            message: item.message,
            url: item.url,
            mimetype: item.mimetype,
            filename: item.filename,
            sent: false,
            sent_at: null,
            broadcast: create_broadcast._id,
          },
        ];

        // Menambahkan spintax message jika ada
        const spintaxMessages = item.spintax.map((spin) => ({
          message: spin.message,
          url: item.url,
          mimetype: item.mimetype,
          filename: item.filename,
          sent: false,
          sent_at: null,
          broadcast: create_broadcast._id,
        }));

        // Menggabungkan keduanya
        return messages.concat(spintaxMessages);
      });
      const save_messages = participants.map((contact, index) => {
        return {
          receiver: contact.phone_number,
          ...messages[index % messages.length],
        };
      });
      const create_messages = await Message.insertMany(save_messages);
      finalResult.data = {
        broadcast: create_broadcast,
        messages: create_messages.length,
      };
      finalResult.success = true;
      finalResult.message = "Berhasil tambah broadcast";
      res.status(200).json(finalResult);
    } catch (e) {
      const status = e.status || 500;
      finalResult.message = e.message || "Internal server error";
      res.status(status).json(finalResult);
    }
  },
  delete: async (req, res) => {
    let finalResult = {
      data: {},
      success: false,
      message: "",
    };
    try {
      const broadcast = await Broadcast.findOne({
        _id: req.params.id,
      });
      if (!broadcast) {
        const error = new Error(
          "Dokumen gagal dihapus. Dokumen tidak ditemukan"
        );
        error.status = 404;
        throw error;
      }
      broadcast.deleted = true;
      broadcast.deleted_at = moment().tz("Asia/Jakarta");
      await broadcast.save();
      finalResult.data = broadcast;
      finalResult.success = true;
      finalResult.message = "Berhasil hapus broadcast";
      res.status(200).json(finalResult);
    } catch (e) {
      const status = e.status || 500;
      finalResult.message = e.message || "Internal server error";
      res.status(status).json(finalResult);
    }
  },
};
