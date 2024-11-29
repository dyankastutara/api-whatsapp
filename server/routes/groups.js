const router = require("express").Router();
const controller = require("../controllers/group");

/* GET Session Whatsapp center page. */
router.get("/:sessionId", controller.get.all);
router.get("/by_id/:sessionId", controller.get.by_id);

module.exports = router;
