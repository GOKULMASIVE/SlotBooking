const express = require("express");
const router = express.Router();
const paymentController = require("../controller/webhooks.controller");

router.post("/create-order", paymentController.createPaymentOrder);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paymentController.handleWebhook,
);

module.exports = router;
