const path = require("path");
const moment = require("moment-timezone");
const { endSession, deleteCreds } = require("../../wa-connection");
//DB
const Account = require("../../models/mongodb/account");
const Session = require("../../models/mongodb/session");

module.exports = {
  get: async (req, res) => {
    const finalResult = {
      data: [],
      count: 0,
      success: false,
      message: "",
    };
    try {
      const response = await Account.find({
        user: req.decoded.id,
        $or: [{ deleted: false }, { deleted: { $exists: false } }],
      }).populate({
        path: "sessions",
        select: "session_id last_active",
      });
      if (!response || response.length === 0) {
        const error = new Error("Data Nomor WhatsApp tidak ditemukan");
        error.status = 404;
        throw error;
      }
      finalResult.data = response;
      finalResult.count = response.length;
      finalResult.success = true;
      finalResult.message = "Data Nomor WhatsApp berhasil didapatkan";
      res.status(200).json(finalResult);
    } catch (e) {
      const status = e.status || 500;
      finalResult.message = e.message || "Internal server error";
      res.status(status).json(finalResult);
    }
  },
  update: {
    single: async (req, res) => {
      const finalResult = {
        data: {},
        success: false,
        message: "",
      };
      try {
        const account = await Account.findOne({
          _id: req.params.id,
          $or: [{ deleted: false }, { deleted: { $exists: false } }],
        });
        if (!account) {
          const error = new Error("Akun WhatsApp tidak ditemukan");
          error.status = 404;
          throw error;
        }
        account.name = req.body.name || account.name;
        account.type = req.body.type || account.type;
        await account.save();
        finalResult.data = account;
        finalResult.success = true;
        finalResult.message = "Akun WhatsApp berhasil diubah";
        res.status(200).json(finalResult);
      } catch (e) {
        const status = e.status || 500;
        finalResult.message = e.message || "Internal server error";
        res.status(status).json(finalResult);
      }
    },
    assign: async (req, res) => {
      const finalResult = {
        data: {},
        success: false,
        message: "",
      };
      try {
        const update = await Account.updateMany(
          {
            _id: { $in: req.body.ids },
          },
          {
            type: req.body.type,
          }
        );
        if (update.matchedCount === 0) {
          const error = new Error("Akun WhatsApp tidak ditemukan");
          error.status = 404;
          throw error;
        }
        finalResult.data = update;
        finalResult.success = true;
        finalResult.message = `${update.matchedCount} Akun WhatsApp berhasil diubah`;
        res.status(200).json(finalResult);
      } catch (e) {
        const status = e.status || 500;
        finalResult.message = e.message || "Internal server error";
        res.status(status).json(finalResult);
      }
    },
  },
  delete: async (req, res) => {
    const finalResult = {
      success: false,
      message: "",
    };
    try {
      const account = await Account.findOne({
        _id: req.params.id,
        $or: [{ deleted: false }, { deleted: { $exists: false } }],
      }).populate({
        path: "sessions",
        select: "session_id last_active",
      });
      if (!account) {
        const error = new Error("Akun WhatsApp tidak ditemukan");
        error.status = 404;
        throw error;
      }
      console.log(account);
      if (account.status === "connected") {
        await endSession(account.sessions.session_id);
        // const { error, message } = await endSession(account.session.session_id);
        // if (error) {
        //   const error = new Error(message);
        //   error.status = 404;
        //   throw error;
        // }
      }
      const { error, message } = await deleteCreds(account.sessions.session_id);
      if (error) {
        const error = new Error(message);
        error.status = 400;
        throw error;
      }
      await Session.findByIdAndDelete(account.sessions._id);
      account.status = "deleted";
      account.deleted = true;
      account.deleted_at = moment().tz("Asia/Jakarta");
      await account.save();
      finalResult.success = true;
      finalResult.message = "Nomor WhatsApp berhasil dihapus";
      res.status(200).json(finalResult);
    } catch (e) {
      const status = e.status || 500;
      finalResult.message = e.message || "Internal server error";
      res.status(status).json(finalResult);
    }
  },
};
