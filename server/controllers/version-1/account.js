const path = require("path");

const { sessionsFolder, deleteCreds } = require("../../connection");
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
        $or: [{ is_deleted: false }, { is_deleted: { $exists: false } }],
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
  delete: async (req, res) => {
    const finalResult = {
      success: false,
      message: "",
    };
    try {
      const account = await Account.findOne({
        _id: req.params.id,
        $or: [{ is_deleted: false }, { is_deleted: { $exists: false } }],
      }).populate({
        path: "sessions",
        select: "session_id last_active",
      });
      if (!account) {
        const error = new Error("Akun WhatsApp tidak ditemukan");
        error.status = 404;
        throw error;
      }
      await Session.findByIdAndDelete(account.session._id);
      await Account.findOneAndUpdate(
        {
          _id: req.params.id,
        },
        {
          is_deleted: true,
          deleted_at: new Date(),
        }
      );
      const sessionPath = await path.join(
        sessionsFolder,
        account.session.session_id
      );
      const { error, message } = await deleteCreds(sessionPath);
      if (error) {
        const error = new Error(message);
        error.status = 400;
        throw error;
      }
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
