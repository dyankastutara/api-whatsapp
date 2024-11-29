require("dotenv");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const responseTime = require("response-time");
// const jsonServer = require("json-server");
const routes = require("./routes");
const app = express();
const fs = require("fs");
const path = require("path");
mongoose.Promise = require("bluebird");

const { initExistingSessions } = require("./connection");
const sessionsFolder = path.join(__dirname, "../sessions");
// Pastikan folder sesi ada
if (!fs.existsSync(sessionsFolder)) {
  fs.mkdirSync(sessionsFolder);
}

app.use(cors());
app.set("port", process.env.PORT || "8080");
app.use(responseTime());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use("/", routes.sessions);
app.use("/contacts", routes.contacts);
app.use("/groups", routes.groups);
app.use("/send_message", routes.send_messages);

app.listen(app.get("port"), (error) => {
  if (error) {
    console.log("Error during app startup", error);
  }
  console.log("Application Start in port " + app.get("port"));
  initExistingSessions();
});
