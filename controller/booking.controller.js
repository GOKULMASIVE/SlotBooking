const bookingService = require("../service/booking.service");

async function create(req, res, next) {
  try {
    const { city, service, amount, status } = req.body;
    const booking = await bookingService.createBookingWithPayment(
      city,
      service,
      amount,
      status,
    );
    res.json(booking);
  } catch (err) {
    next(err);
  }
}

async function cancel(req, res, next) {
  try {
    const result = await bookingService.cancelBooking(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, cancel };
