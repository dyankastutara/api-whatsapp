"use strict";

require("dotenv").config();
const router = require("express").Router();

/* GET home page. */
router.get("/", function (req, res, next) {
  res.json({ status: "Error" });
});

module.exports = {
  sessions: require("./sessions"),
  contacts: require("./contacts"),
  groups: require("./groups"),
  send_messages: require("./send_messages"),
  accounts: require("./accounts"),
};
