const router = require("express").Router();
const controller = require("../controllers/contact");

/* GET Session Whatsapp center page. */
router.post("/check", controller.check.phone_number);

module.exports = router;
