const express = require("express");
const router = express.Router();
const paymentController = require("../controller/webhooks.controller");

// express.json() applied inline here because the global middleware is registered
// AFTER webhook routes (to keep the Razorpay raw body intact for HMAC verification).
router.post("/create-order", express.json(), paymentController.createPaymentOrder);

router.post(
  "/razorpay",
  // Use a function for `type` so the body is ALWAYS parsed as a raw Buffer,
  // even when the Content-Type header is completely absent.
  // - "application/json" fails if Content-Type is missing
  // - "*/*"             still fails if there is NO Content-Type at all
  // - () => true        always returns true → body always captured
  express.raw({ type: () => true }),
  paymentController.handleWebhook,
);

module.exports = router;
