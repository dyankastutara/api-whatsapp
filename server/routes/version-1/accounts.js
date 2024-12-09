const router = require("express").Router();
const controller = require("../../controllers/version-1/account");
const authorization = require("../../helpers/authorization");

/* GET Session Whatsapp center page. */
router.get("/", authorization.access, controller.get);
router.delete("/:id", authorization.access, controller.delete);

module.exports = router;
