const router = require("express").Router();
const controller = require("../controllers/contact");

/* GET Session Whatsapp center page. */
router.get("/person/:sessionId", controller.get.personal);
router.get("/groups/:sessionId", controller.get.groups);
router.get("/participants/:sessionId", controller.get.participants);

router.post("/check/:sessionId", controller.check);

module.exports = router;
