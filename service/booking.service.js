const paymentService = require("../service/webhooks.service");
const pool = require("../db/db");
const {
  getBestPartner,
  invalidateCache,
} = require("../service/partners.service");

async function createBookingWithPayment(city, service, amount) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const partner = await getBestPartner(city, service);
    if (!partner) throw new Error("No partner available");

    await client.query(`SELECT * FROM partners WHERE id=$1 FOR UPDATE`, [
      partner.id,
    ]);

    const bookingResult = await client.query(
      `
      INSERT INTO bookings (partner_id, city, service_type, amount, status)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [partner.id, city, service, amount, "PENDING"],
    );

    const booking = bookingResult.rows[0];

    await client.query(
      `
      UPDATE partners
      SET active_jobs = active_jobs + 1,
          last_assigned_at = NOW()
      WHERE id=$1
      `,
      [partner.id],
    );
    console.log(booking);
    await client.query("COMMIT");
    const { order, payment } = await paymentService.createPaymentOrder(
      booking.id,
      amount,
    );

    await invalidateCache(city, service);

    return {
      booking,
      payment: {
        id: payment.id,
        razorpay_order_id: order.id,
        amount: payment.amount,
        currency: order.currency,
        status: payment.status,
      },
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function cancelBooking(bookingId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Lock booking row
    const bookingRes = await client.query(
      `SELECT * FROM bookings WHERE id=$1 FOR UPDATE`,
      [bookingId],
    );
    const booking = bookingRes.rows[0];
    if (!booking) throw new Error("Booking not found");
    if (booking.status === "CANCELLED")
      return { cancelled: false, message: "Already cancelled" };

    // 2️⃣ Get associated payment
    const paymentRes = await client.query(
      `SELECT * FROM payments WHERE booking_id=$1 AND status='SUCCESS'`,
      [bookingId],
    );
    const payment = paymentRes.rows[0];

    let refundAmount = booking.amount; // full refund; can customize for partial

    // 3️⃣ Initiate Razorpay Refund if payment exists
    if (payment) {
      await razorpay.payments.refund(payment.provider_payment_id, {
        amount: Math.round(refundAmount * 100), // in paise
      });

      // 4️⃣ Update payment status to REFUNDED
      await client.query(`UPDATE payments SET status='REFUNDED' WHERE id=$1`, [
        payment.id,
      ]);
    } else {
      // If payment was not captured yet, mark as REFUND_INITIATED
      await client.query(
        `INSERT INTO payments (booking_id, amount, status)
         VALUES ($1,$2,'REFUND_INITIATED')`,
        [bookingId, refundAmount],
      );
    }

    // 5️⃣ Update booking status
    await client.query(`UPDATE bookings SET status='CANCELLED' WHERE id=$1`, [
      bookingId,
    ]);

    await client.query("COMMIT");

    return { cancelled: true, refund: refundAmount };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { createBookingWithPayment, cancelBooking };
