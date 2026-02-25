function errorHandler(err, req, res, next) {
  console.error(err);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  if (err.code === "23505") {
    statusCode = 409;
    message = "Duplicate entry";
  }

  if (err.code === "23503") {
    statusCode = 400;
    message = "Invalid reference";
  }

  if (err.name === "ValidationError") {
    statusCode = 400;
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
}

module.exports = errorHandler;
