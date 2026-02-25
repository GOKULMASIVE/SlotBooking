const express = require("express");
const router = express.Router();
const controller = require("../controller/booking.controller");

router.post("/", controller.create);
router.post("/:id/cancel", controller.cancel);

module.exports = router;
