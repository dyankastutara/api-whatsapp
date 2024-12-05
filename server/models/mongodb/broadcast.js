require("../../config/mongodb/config");
const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const broadcastSchema = new Schema(
  {
    name: { type: String },
    senders: [
      {
        account_id: {
          type: Schema.Types.ObjectId,
          ref: "WaAccount",
          required: true,
        },
      },
    ],
    group_id: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    delay: {},
    account: {
      type: Schema.Types.ObjectId,
      ref: "Account",
    },
    user: { type: Number },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const Broadcast = mongoose.model("Broadcast", broadcastSchema);

module.exports = Broadcast;
