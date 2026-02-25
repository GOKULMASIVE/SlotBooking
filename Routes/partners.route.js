const express = require("express");
const router = express.Router();
const controller = require("../controller/partners.controller");

router.post("/", controller.createPartner);
router.get("/available", controller.getAvailable);

module.exports = router;
