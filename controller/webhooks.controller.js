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
    await paymentService.handleWebhook(req, res);
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { createPaymentOrder, handleWebhook };
