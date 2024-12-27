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
      })
        .sort({
          connected_at: -1,
        })
        .populate({
          path: "sessions",
          select: "session_id last_active",
        });
      if (!response || response.length === 0) {
        const error = new Error("Data Nomor WhatsApp tidak ditemukan");
        error.status = 200;
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
  delete: {
    by_id: async (req, res) => {
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
        if (
          account.status === "connected" &&
          account.sessions &&
          account.sessions.session_id
        ) {
          await endSession(account.sessions.session_id);
          const { error, message } = await deleteCreds(
            account.sessions.session_id
          );
          if (error) {
            const error = new Error(message);
            error.status = 400;
            throw error;
          }
        }
        await Session.findOneAndDelete({
          account: account._id,
        });
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
    multiple_ids: async (req, res) => {
      const finalResult = {
        ids: [],
        success: false,
        message: "",
      };
      try {
        const accounts = await Account.find({
          _id: { $in: req.body.ids },
          $or: [{ deleted: false }, { deleted: { $exists: false } }],
        }).populate({
          path: "sessions",
          select: "session_id last_active",
        });
        if (accounts.length === 0) {
          const error = new Error("Akun WhatsApp tidak ditemukan");
          error.status = 404;
          throw error;
        }
        for (let account of accounts) {
          if (account.status === "connected" && account.sessions.session_id) {
            await endSession(account.sessions.session_id);
            const { error, message } = await deleteCreds(
              account.sessions.session_id
            );
            if (error) {
              const error = new Error(message);
              error.status = 400;
              throw error;
            }
          }
          await Session.findOneAndDelete({
            account: account._id,
          });
          account.status = "deleted";
          account.deleted = true;
          account.deleted_at = moment().tz("Asia/Jakarta");
          await account.save();
        }
        const deleted_ids = accounts.map((item) => item._id);
        finalResult.ids = deleted_ids;
        finalResult.success = true;
        finalResult.message = `${deleted_ids.length} nomor WhatsApp berhasil dihapus`;
        res.status(200).json(finalResult);
      } catch (e) {
        const status = e.status || 500;
        finalResult.message = e.message || "Internal server error";
        res.status(status).json(finalResult);
      }
    },
  },
};
