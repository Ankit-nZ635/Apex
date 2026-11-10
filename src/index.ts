import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { registerRoutes } from './routes';
import { closePools, verifyHealth, redis } from './db';
import dotenv from 'dotenv';

dotenv.config();

export function buildApp(): FastifyInstance {
  const app = fastify({
    logger: process.env.NODE_ENV === 'test' ? false : {
      level: process.env.LOG_LEVEL || 'info',
    },
    disableRequestLogging: process.env.NODE_ENV === 'test',
  });

  // Enable CORS for frontend Vite dev server & production
  app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Idempotency-Key', 'idempotency-key'],
  });

  // Register all Ledger API endpoints
  app.register(registerRoutes);

  return app;
}

async function startServer(): Promise<void> {
  const app = buildApp();
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';

  // Ensure Redis connection is established
  try {
    await redis.connect();
  } catch (err: any) {
    // If already connected or connecting, ignore
    if (!err.message?.includes('already')) {
      console.warn('Initial Redis connection warning:', err.message);
    }
  }

  // Pre-flight database and cache connectivity check
  const health = await verifyHealth();
  if (!health.postgres) {
    console.error('FATAL: Could not connect to PostgreSQL database.');
  }
  if (!health.redis) {
    console.warn('WARNING: Could not connect to Redis. Idempotency layer will operate in degraded mode.');
  }

  try {
    await app.listen({ port, host });
    console.log(`[Ledger Engine] Fastify server listening on http://${host}:${port}`);
    console.log(`[Ledger Engine] PostgreSQL & Redis connection pools initialized.`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`[Ledger Engine] Received ${signal}. Draining connections and shutting down...`);
    try {
      await app.close();
      await closePools();
      console.log('[Ledger Engine] Clean shutdown completed.');
      process.exit(0);
    } catch (err) {
      console.error('[Ledger Engine] Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (require.main === module) {
  startServer();
}

