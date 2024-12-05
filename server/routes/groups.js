const router = require("express").Router();
const controller = require("../controllers/group");
const authorization = require("../helpers/authorization");

/* GET Session Whatsapp center page. */
router.post("/grabber", authorization.access, controller.grabber.groups);
router.post(
  "/grabber/participants",
  authorization.access,
  controller.grabber.participant
);

module.exports = router;
