require("../../config/mongodb/config");
const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const groupSchema = new Schema(
  {
    gid: { type: String },
    subject: { type: String },
    owner: { type: String },
    participants: [
      {
        id: { type: String },
        name: { type: String },
        phone_number: { type: String, maxLength: 15 },
        subscribed: { type: Boolean, default: true },
      },
    ],
    deleted: { type: Boolean, default: false },
    deleted_at: { type: Date },
    user: { type: Number },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const Group = mongoose.model("Group", groupSchema);

module.exports = Group;
