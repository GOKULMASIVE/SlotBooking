Optimizing Partner Availability APIs

This document explains how to optimize database queries for fetching available partners, reduce latency with caching, and handle cache invalidation efficiently in a slot-based booking system.

1️⃣ Database Indexing

To quickly find available partners based on city, service type, and workload, we need proper indexes.

Example Table: partners

CREATE TABLE partners (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
city VARCHAR NOT NULL,
service_type VARCHAR NOT NULL,
is_available BOOLEAN DEFAULT TRUE,
active_jobs INT DEFAULT 0,
rating NUMERIC(3,2) DEFAULT 0,
last_assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

Recommended Index

CREATE INDEX idx_partner_available
ON partners (city, service_type, active_jobs, last_assigned_at)
WHERE is_available = true;

Why this helps:

. Filtered index (WHERE is_available = true) → Only considers available partners.

. Ordering columns (active_jobs, last_assigned_at) → Allows fast queries for the partner with lowest workload and earliest assignment.

2️⃣ Caching Strategy

Since partner availability is queried frequently, caching helps reduce database load and response time.

Suggested Approach

. Use Redis as an in-memory cache.

. Cache the result of availability queries per (city, service_type) combination.

Example Redis Key:

. partner:available:{city}:{service_type}

Pseudocode for Fetching Partners with Cache:

async function getBestPartner(city, service_type) {
const cacheKey = `partner:available:${city}:${service_type}`;

// 1. Check Redis cache
const cached = await redis.get(cacheKey);
if (cached) {
return JSON.parse(cached);
}

// 2. Query database
const partner = await db.query(
`SELECT * FROM partners
     WHERE city=$1 AND service_type=$2 AND is_available=true
     ORDER BY active_jobs ASC, last_assigned_at ASC
     LIMIT 1`,
[city, service_type]
);

if (partner.rows.length) {
// 3. Store in Redis for 30s
await redis.set(cacheKey, JSON.stringify(partner.rows[0]), "EX", 30);
return partner.rows[0];
}

return null;
}

3️⃣ Cache Invalidation

Whenever partner availability changes (booking assigned, booking cancelled), the cached data must be invalidated to prevent stale responses.

When to Invalidate

. New booking assigned: active_jobs changes → partner may no longer be optimal.

. Booking cancelled: active_jobs decreases → partner may become available again.

. Partner goes offline: is_available changes.

Example Invalidation Function:

async function invalidateCache(city, service_type) {
const cacheKey = `partner:available:${city}:${service_type}`;
await redis.del(cacheKey);
}

4️⃣ Additional Optimizations

Partial caching: Only cache the best partner per city/service instead of the full list.

TTL tuning: Keep TTL short (e.g., 30–60 seconds) to handle high concurrency without stale assignments.

Concurrency safety: Use row-level locking (FOR UPDATE) when assigning a partner to prevent double-booking.
