require("../../config/mongodb/config");
const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const SessionSchema = new Schema({
  session_id: { type: String, required: true, unique: true },
  path: { type: String },
  creds: { type: Object },
  last_active: { type: Date, default: Date.now },
  account: {
    type: Schema.Types.ObjectId,
    ref: "Account",
  },
});

const Session = mongoose.model("Session", SessionSchema);

module.exports = Session;
