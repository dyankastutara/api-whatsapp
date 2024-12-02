const router = require("express").Router();
const controller = require("../controllers/session");

/* GET Session Whatsapp center page. */
router.post("/session/status", controller.check.status);
router.post("/session", controller.create.session);
router.post("/session/connect", controller.connect);
router.post("/session/disconnect", controller.disconnect);

module.exports = router;
