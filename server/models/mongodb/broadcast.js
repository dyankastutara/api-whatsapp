require("../../config/mongodb/config");
const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const broadcastSchema = new Schema(
  {
    name: { type: String },
    senders: [
      {
        account: {
          type: Schema.Types.ObjectId,
          ref: "Account",
          required: true,
        },
      },
    ],
    groups: [
      {
        type: Schema.Types.ObjectId,
        ref: "Group",
        required: true,
      },
    ],
    contents: [
      {
        message: { type: String },
        url: { type: String },
        mimetype: { type: String },
        filename: { type: String },
        spintax: [
          {
            message: { type: String },
          },
        ],
        interactive: [
          {
            textreply: {
              type: Schema.Types.ObjectId,
              ref: "TextReply",
            },
          },
        ],
      },
    ],
    is_deleted: { type: Boolean },
    deleted_at: { type: Date },
    delay: {
      // seconds
      wait: { type: Number },
      to: { type: Number },
    },
    rest_mode: {
      stop_sending_after: { type: Number }, //message sent
      and_rest_for: { type: Number }, //seconds
    },
    perfect_timing: { type: Boolean },
    time_to_send: {
      type: { type: String },
      time: { type: Date },
    },
    status: { type: String, enum: ["draft", "running", "completed"] },
    user: { type: Number },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);
broadcastSchema.virtual("messages", {
  ref: "Message",
  localField: "_id",
  foreignField: "broadcast",
});
// Aktifkan virtuals untuk output JSON
broadcastSchema.set("toJSON", { virtuals: true });
broadcastSchema.set("toObject", { virtuals: true });

const Broadcast = mongoose.model("Broadcast", broadcastSchema);

module.exports = Broadcast;
