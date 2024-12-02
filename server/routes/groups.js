const router = require("express").Router();
const controller = require("../controllers/group");

/* GET Session Whatsapp center page. */
router.post("/", controller.get.all);
router.post("/detail", controller.get.by_id);

module.exports = router;
