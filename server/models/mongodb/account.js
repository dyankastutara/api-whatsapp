require("../../config/mongodb/config");
const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const accountSchema = new Schema(
  {
    jid: { type: String },
    name: { type: String },
    phone_number: { type: String, maxLength: 15 },
    status: {
      type: String,
      enum: ["connected", "disconnected", "pending"],
    },
    connected_at: { type: Date },
    type: { type: String, enum: ["broadcast", "warm", "api", ""] },
    deleted: { type: Boolean, default: false },
    deleted_at: { type: Date },
    user: { type: Number },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

accountSchema.virtual("sessions", {
  ref: "Session",
  localField: "_id",
  foreignField: "account",
  justOne: true,
});

// Aktifkan virtuals untuk output JSON
accountSchema.set("toJSON", { virtuals: true });
accountSchema.set("toObject", { virtuals: true });

const Account = mongoose.model("Account", accountSchema);

module.exports = Account;
