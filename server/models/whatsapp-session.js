require("../config/config");
const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const whatsappSessionSchema = new Schema({
  sessionId: { type: String, required: true, unique: true },
  path: { type: String },
  creds: { type: Object }, // menyimpan kredensial sesi
  lastActive: { type: Date, default: Date.now },
  user: { type: Object },
});

const WhatsappSession = mongoose.model(
  "WhatsappSession",
  whatsappSessionSchema
);

module.exports = WhatsappSession;
