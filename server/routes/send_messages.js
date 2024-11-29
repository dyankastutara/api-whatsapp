const router = require("express").Router();
const controller = require("../controllers/send_message");

/* GET Session Whatsapp center page. */
router.post("/:sessionId", controller.send_message.by_phone_number);
router.post("/person/:sessionId", controller.send_message.personal);
router.post("/group/:sessionId", controller.send_message.group);

module.exports = router;
