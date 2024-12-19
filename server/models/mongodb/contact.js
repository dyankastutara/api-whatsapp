require("../../config/mongodb/config");
const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const contactSchema = new Schema(
  {
    jid: { type: String },
    name: { type: String },
    phone_number: { type: String, maxLength: 15 },
    subscribed: { type: Boolean, default: true },
    deleted: { type: Boolean, default: false },
    deleted_at: { type: Date },
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const Contact = mongoose.model("Contact", contactSchema);

module.exports = Contact;
