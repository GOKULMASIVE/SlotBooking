const express = require("express");
const partnerRoutes = require("./routes/partners.route");
const bookingRoutes = require("./routes/booking.route");
const webhookRoutes = require("./routes/webhook.route");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.use("/api/webhooks", webhookRoutes);

app.use(express.json());

app.use("/api/partners", partnerRoutes);
app.use("/api/bookings", bookingRoutes);

app.use(errorHandler);

module.exports = app;
