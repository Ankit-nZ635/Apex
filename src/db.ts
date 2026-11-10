import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL Connection Pool configuration
export const pgPool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  user: process.env.PGUSER || 'ledger_admin',
  password: process.env.PGPASSWORD || 'ledger_secret_password',
  database: process.env.PGDATABASE || 'ledger_db',
  max: parseInt(process.env.PGPOOL_MAX || '30', 10), // High concurrency throughput
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Configure pg parser for BIGINT (Postgres type 20) to return as string to prevent 64-bit precision truncation
import { types } from 'pg';
types.setTypeParser(20, (val: string) => val); // INT8 / BIGINT as string

// Redis Client configuration for Idempotency locks and response cache
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || 'redis_secret_password',
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 2000);
    return delay;
  },
  lazyConnect: true,
});

/**
 * Execute raw SQL query against connection pool with automatic release
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await pgPool.query<T>(text, params);
  const duration = Date.now() - start;
  if (process.env.DEBUG_SQL === 'true') {
    console.debug('[SQL Query]', { text, params, duration: `${duration}ms`, rows: res.rowCount });
  }
  return res;
}

/**
 * Execute a unit of work strictly inside a transactional boundary (BEGIN ... COMMIT / ROLLBACK)
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Health check verification for Postgres and Redis
 */
export async function verifyHealth(): Promise<{ postgres: boolean; redis: boolean }> {
  let postgresHealthy = false;
  let redisHealthy = false;

  try {
    const res = await pgPool.query('SELECT 1 as healthy');
    postgresHealthy = res.rows[0]?.healthy === 1;
  } catch (err) {
    console.error('PostgreSQL health check failed:', err);
  }

  try {
    const ping = await redis.ping();
    redisHealthy = ping === 'PONG';
  } catch (err) {
    console.error('Redis health check failed:', err);
  }

  return { postgres: postgresHealthy, redis: redisHealthy };
}

/**
 * Graceful teardown of network sockets and connection pools
 */
export async function closePools(): Promise<void> {
  await pgPool.end();
  await redis.quit();
}

