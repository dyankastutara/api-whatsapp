const router = require("express").Router();
const controller = require("../controllers/session");

/* GET Session Whatsapp center page. */
router.get("/session/status/:sessionId", controller.get.status);
router.post("/session", controller.create.session);
router.post("/session/disconnect", controller.disconnect);

module.exports = router;
