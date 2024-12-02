const router = require("express").Router();
const controller = require("../controllers/send_message");

/* GET Session Whatsapp center page. */
router.post("/", controller.send_message.by_phone_number);
router.post("/group", controller.send_message.group);

router.post("/image_url", controller.send_image.by_phone_number);
router.post("/image_url/group", controller.send_image.group);

router.post("/file_url", controller.send_file.by_phone_number);
router.post("/file_url/group", controller.send_file.group);

router.post("/broadcast", controller.send_broadcast.message);
router.post("/broadcast/image_url", controller.send_broadcast.image);
router.post("/broadcast/file_url", controller.send_broadcast.file);

module.exports = router;
