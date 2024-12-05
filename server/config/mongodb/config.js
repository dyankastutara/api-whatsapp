const mongoose = require("mongoose");
const app = require("express")();
require("dotenv").config();

var db_config = {
  development: "mongodb://localhost:27017/plasgos_whatsapp",
  test: "mongodb://localhost:27017/plasgos_whatsapp_test",
  production: process.env.MONGODB_WHATSAPP_SESSIONS_URI,
};

var app_env = app.settings.env;
async function main() {
  // await mongoose.set('useFindAndModify', false);
  await mongoose.connect(db_config[app_env]);
}
mongoose.connection.on("connected", () => {
  console.log("Database Connected ", db_config[app_env]);
});

mongoose.connection.on("error", () => {
  console.log("Database error ", db_config[app_env]);
});

mongoose.connection.on("disconnected", () => {
  console.log("Database disconnected ", db_config[app_env]);
});
main()
  .then(() => console.log("MongoDB plasgos_whatsapp connected"))
  .catch((err) => console.log(err));

process.on("SIGINT", function () {
  mongoose.connection.close(function () {
    console.log("Mongoose connection disconnected, app termination");
    process.exit(0);
  });
});
