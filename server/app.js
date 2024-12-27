require("dotenv");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const responseTime = require("response-time");
// const jsonServer = require("json-server");
const routesV1 = require("./routes/version-1");
const schedule = require("./helpers/schedule");
const { initializeSocketIo } = require("./socket.io-connection");
const app = express();
const fs = require("fs");
const path = require("path");
mongoose.Promise = require("bluebird");

const server = http.createServer(app);

const { initExistingSessions } = require("./wa-connection");
const sessionsFolder = path.join(__dirname, "../sessions");
// Pastikan folder sesi ada
if (!fs.existsSync(sessionsFolder)) {
  fs.mkdirSync(sessionsFolder);
}
//middleware
app.use(cors());
app.set("port", process.env.PORT || "8080");
app.use(responseTime());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
//socket.io
initializeSocketIo();
//endpoint
app.use("/session", routesV1.sessions);
app.use("/contacts", routesV1.contacts);
app.use("/groups", routesV1.groups);
app.use("/send_message", routesV1.send_messages);
app.use("/accounts", routesV1.accounts);
app.use("/broadcasts", routesV1.broadcasts);

app.listen(app.get("port"), (error) => {
  if (error) {
    console.log("Error during app startup", error);
  }
  console.log("Application Start in port " + app.get("port"));
  initExistingSessions();
  schedule.send_broadcast(() => {
    console.log("Schedule broadcast running");
  });
});
