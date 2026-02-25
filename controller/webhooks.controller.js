const paymentService = require("../service/webhooks.service");

async function createPaymentOrder(req, res, next) {
  try {
    const { booking_id, amount } = req.body;
    if (!booking_id || !amount) {
      return res
        .status(400)
        .json({ message: "booking_id and amount required" });
    }

    const result = await paymentService.createPaymentOrder(booking_id, amount);

    res.json({
      order_id: result.order.id,
      amount: result.payment.amount,
      currency: result.order.currency,
    });
  } catch (err) {
    next(err);
  }
}

async function handleWebhook(req, res, next) {
  try {
    // NOTE: paymentService.handleWebhook sends the response itself (200/400/500).
    // Do NOT call res.json() again here — that would cause a double-response crash.
    await paymentService.handleWebhook(req, res);
  } catch (err) {
    next(err);
  }
}

module.exports = { createPaymentOrder, handleWebhook };
