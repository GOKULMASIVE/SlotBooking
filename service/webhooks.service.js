const pool = require("../config/db");
const razorpay = require("../config/razorPay");
const crypto = require("crypto");

async function createPaymentOrder(bookingId, amount) {
  const options = {
    amount: Math.round(amount * 100),
    currency: "INR",
    receipt: bookingId,
    payment_capture: 1,
  };

  const order = await razorpay.orders.create(options);
  console.log(bookingId, order.id, amount);
  //   return;
  const result = await pool.query(
    `INSERT INTO payments (booking_id, provider_payment_id, amount, status)
     VALUES ($1,$2,$3,'PENDING') RETURNING *`,
    [bookingId, order.id, amount],
  );

  return { order, payment: result.rows[0] };
}

async function handleWebhook(req, res) {
  try {
    const body = req.body?.toString();
    if (!body) return res.status(400).send("Empty body");

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid signature" });
    }

    const event = JSON.parse(body);

    if (!event.payload?.payment?.entity) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payload" });
    }

    const paymentId = event.payload.payment.entity.id;
    const bookingId = event.payload.payment.entity.notes?.booking_id;

    if (!bookingId) {
      return res
        .status(400)
        .json({ success: false, message: "Booking ID missing" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (event.event === "payment.captured") {
        await client.query(
          `UPDATE payments SET status='SUCCESS' WHERE provider_payment_id=$1`,
          [paymentId],
        );
        await client.query(
          `UPDATE bookings SET status='CONFIRMED' WHERE id=$1`,
          [bookingId],
        );
      }

      if (event.event === "payment.failed") {
        await client.query(
          `UPDATE payments SET status='FAILED' WHERE provider_payment_id=$1`,
          [paymentId],
        );
        await client.query(
          `UPDATE bookings SET status='PAYMENT_FAILED' WHERE id=$1`,
          [bookingId],
        );
      }

      if (event.event === "refund.processed") {
        await client.query(
          `UPDATE payments SET status='REFUNDED' WHERE provider_payment_id=$1`,
          [paymentId],
        );
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);

    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = { handleWebhook, createPaymentOrder };
