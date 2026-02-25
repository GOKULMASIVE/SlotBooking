const partnerService = require("../service/partners.service");

async function createPartner(req, res, next) {
  try {
    const { city, service_type } = req.body;

    if (!city || !service_type) {
      return res.status(400).json({
        message: "city and service_type are required",
      });
    }

    const partner = await partnerService.createPartner(req.body);

    res.status(201).json({
      message: "Partner created successfully",
      data: partner,
    });
  } catch (err) {
    next(err);
  }
}

async function getAvailable(req, res, next) {
  try {
    const { city, service } = req.query;
    const partner = await partnerService.getBestPartner(city, service);
    res.json(partner);
  } catch (err) {
    next(err);
  }
}

module.exports = { getAvailable, createPartner };
