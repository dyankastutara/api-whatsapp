require("../../config/mongodb/config");
const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const accountSchema = new Schema(
  {
    jid: { type: String },
    name: { type: String },
    phone_number: { type: String, maxLength: 20 },
    status: {
      type: String,
      enum: ["connected", "disconnected", "pending"],
    },
    connected_at: { type: Date },
    type: { type: String, enum: ["broadcast", "warm", "api", ""] },
    is_deleted: { type: Boolean },
    deleted_at: { type: Date },
    user_id: { type: Number },
    user: {
      id: { type: Number },
      name: { type: String },
      email: { type: String },
      phone_number: { type: String },
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

accountSchema.virtual("sessions", {
  ref: "Session", // Nama model Post
  localField: "_id", // Field pada User
  foreignField: "account", // Field pada Post yang mereferensi User
  justOne: true,
});

// Aktifkan virtuals untuk output JSON
accountSchema.set("toJSON", { virtuals: true });
accountSchema.set("toObject", { virtuals: true });

const Account = mongoose.model("Account", accountSchema);

module.exports = Account;
