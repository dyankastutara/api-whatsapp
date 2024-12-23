const router = require("express").Router();
const controller = require("../../controllers/version-1/broadcast");
const authorization = require("../../helpers/authorization");
const { uploadFile } = require("../../helpers/upload");

/* GET Session Whatsapp center page. */
router.get("/", authorization.access, controller.get.all);
router.get("/:id", authorization.access, controller.get.by_id);
router.get("/:id/messages", authorization.access, controller.get.messages);

router.post("/", authorization.access, uploadFile.any(), controller.create);
router.put(
  "/:id",
  authorization.access,
  uploadFile.any(),
  controller.update.by_id
);
router.patch("/status/:id", authorization.access, controller.update.status);
router.delete("/:id", authorization.access, controller.delete.by_id);
router.post(
  "/delete/multiple-ids",
  authorization.access,
  controller.delete.multiple_ids
);

module.exports = router;
