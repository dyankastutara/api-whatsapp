const router = require("express").Router();
const controller = require("../../controllers/version-1/broadcast");
const authorization = require("../../helpers/authorization");
const { uploadFile } = require("../../helpers/upload");

/* GET Session Whatsapp center page. */
router.get("/", authorization.access, controller.get.all);
router.get("/:id", authorization.access, controller.get.by_id);

router.post("/", authorization.access, uploadFile.any(), controller.create);
// router.post("/", authorization.access, controller.create);

module.exports = router;
