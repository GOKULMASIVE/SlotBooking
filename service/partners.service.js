const pool = require("../db/db");
const redis = require("../redis/redis");

async function createPartner(data) {
  const {
    city,
    service_type,
    is_available = true,
    active_jobs = 0,
    rating = 5.0,
  } = data;

  const result = await pool.query(
    `
    INSERT INTO partners
    (city, service_type, is_available, active_jobs, rating)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [city, service_type, is_available, active_jobs, rating],
  );

  return result.rows[0];
}

async function getBestPartner(city, service) {
  const cacheKey = `partner:${city}:${service}`;

  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const result = await pool.query(
    `
    SELECT * FROM partners
    WHERE city=$1
      AND service_type=$2
      AND is_available=true
    ORDER BY rating DESC
    LIMIT 1
    `,
    [city, service],
  );

  if (!result.rows.length) return null;

  await redis.set(cacheKey, JSON.stringify(result.rows[0]), "EX", 30);

  return result.rows[0];
}

async function invalidateCache(city, service) {
  await redis.del(`partner:${city}:${service}`);
}

module.exports = { getBestPartner, invalidateCache, createPartner };
