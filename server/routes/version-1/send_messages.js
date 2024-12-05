const router = require("express").Router();
const controller = require("../../controllers/version-1/send_message");
const authorization = require("../../helpers/authorization");

/* GET Session Whatsapp center page. */
router.post("/", authorization.access, controller.send_message.by_phone_number);
router.post("/group", authorization.access, controller.send_message.group);

router.post(
  "/image_url",
  authorization.access,
  controller.send_image.by_phone_number
);
router.post(
  "/image_url/group",
  authorization.access,
  controller.send_image.group
);

router.post(
  "/file_url",
  authorization.access,
  controller.send_file.by_phone_number
);
router.post(
  "/file_url/group",
  authorization.access,
  controller.send_file.group
);

router.post(
  "/broadcast",
  authorization.access,
  controller.send_broadcast.message
);
router.post(
  "/broadcast/image_url",
  authorization.access,
  controller.send_broadcast.image
);
router.post(
  "/broadcast/file_url",
  authorization.access,
  controller.send_broadcast.file
);

module.exports = router;
