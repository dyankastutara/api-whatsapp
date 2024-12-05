const router = require("express").Router();
const controller = require("../../controllers/version-1/group");
const authorization = require("../../helpers/authorization");

/* GET Session Whatsapp center page. */
router.get("/", authorization.access, controller.get.all);
router.get("/:id", authorization.access, controller.get.by_id);

router.post("/grabber", authorization.access, controller.grabber.groups);
router.post(
  "/grabber/participants",
  authorization.access,
  controller.grabber.participant
);

router.post("/new", authorization.access, controller.add.new);
router.post(
  "/sync_with_ids",
  authorization.access,
  controller.add.sync_with_ids
);
router.post("/:id/contacts", authorization.access, controller.add.contacts);
module.exports = router;
