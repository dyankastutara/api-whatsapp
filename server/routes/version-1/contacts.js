const router = require("express").Router();
const controller = require("../../controllers/version-1/contact");
const authorization = require("../../helpers/authorization");

/* GET Session Whatsapp center page. */
router.post("/check", authorization.access, controller.check.phone_number);
router.post("/grabber", authorization.access, controller.grabber.phone_number);

module.exports = router;
