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

router.patch("/:id", authorization.access, controller.update.by_id);
router.patch(
  "/:id/contact/:contact_id",
  authorization.access,
  controller.update.contact
);

router.delete("/:id", authorization.access, controller.delete.by_id);
router.delete(
  "/:id/contact/:contact_id",
  authorization.access,
  controller.delete.participant
);
router.post(
  "/delete/multiple-ids",
  authorization.access,
  controller.delete.multiple_ids
);
router.post(
  "/:id/contact/delete/multiple-ids",
  authorization.access,
  controller.delete.multiple_participants_ids
);
module.exports = router;
