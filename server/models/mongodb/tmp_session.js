require("../../config/mongodb/config");
const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const temporarySessionSchema = new Schema({
  session_id: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  user: { type: Number, required: true },
});

const TmpSession = mongoose.model("TmpSession", temporarySessionSchema);

module.exports = TmpSession;
