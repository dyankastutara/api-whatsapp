const router = require("express").Router();
const controller = require("../controllers/session");
const authorization = require("../helpers/authorization");

/* GET Session Whatsapp center page. */
router.post("/", authorization.access, controller.create);
router.post("/connect", authorization.access, controller.connect);
router.post("/disconnect", authorization.access, controller.disconnect);
router.post("/status", authorization.access, controller.check);

module.exports = router;
