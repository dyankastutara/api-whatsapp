require("../../config/mongodb/config");
const mongoose = require("mongoose");

const { Schema } = mongoose;
const messageSchema = new Schema(
  {
    mid: { type: String },
    message: { type: String },
    url: { type: String },
    mimetype: { type: String },
    filename: { type: String },
    interactive: [
      {
        textreply: {
          type: Schema.Types.ObjectId,
          ref: "TextReply",
        },
      },
    ],
    status: {
      type: String,
      enum: ["sent", "pending", "failed", "invalid", ""],
    },
    embed: { type: Boolean, default: false },
    sent: { type: Boolean },
    sent_at: { type: Date },
    deleted: { type: Boolean },
    deleted_at: { type: Date },
    receiver: {
      type: String,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "Account",
    },
    broadcast: {
      type: Schema.Types.ObjectId,
      ref: "Broadcast",
      required: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
