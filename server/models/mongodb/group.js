require("../../config/mongodb/config");
const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const groupSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    subject: { type: String },
    owner: { type: String },
    participants: [
      {
        id: { type: String, required: true },
        name: { type: String },
        phone_number: { type: String, required: true, maxLength: 15 },
      },
    ],
    user: {
      id: { type: Number },
      name: { type: String },
      email: { type: String },
      phone_number: { type: String },
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const Group = mongoose.model("Group", groupSchema);

module.exports = Group;
