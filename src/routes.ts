import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { LedgerService, LedgerError } from './ledger.service';
import { AuthService } from './auth.service';
import { AccountType, PostTransactionDTO, UserRole } from './types';
import { verifyHealth } from './db';

const ledgerService = new LedgerService();
const authService = new AuthService();

/**
 * Extracts optional authenticated user ID from request header
 */
function extractOptionalUserId(request: FastifyRequest): string | undefined {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return undefined;
  }
  const token = authHeader.slice(7).trim();
  try {
    const payload = authService.verifyToken(token);
    return payload.id;
  } catch (err) {
    return undefined;
  }
}

export async function registerRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  // Global error handler for custom Ledger errors and schema validation errors
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof LedgerError) {
      reply.status(error.statusCode).send({
        error: error.name,
        message: error.message,
        statusCode: error.statusCode,
      });
      return;
    }

    if (error.validation) {
      reply.status(400).send({
        error: 'ValidationError',
        message: error.message,
        details: error.validation,
        statusCode: 400,
      });
      return;
    }

    fastify.log.error(error);
    reply.status(500).send({
      error: 'InternalServerError',
      message: error.message || 'An unexpected error occurred',
      statusCode: 500,
    });
  });

  // --------------------------------------------------------------------------
  // GET /health
  // Real-time infrastructure health probe
  // --------------------------------------------------------------------------
  fastify.get('/health', async (_req, reply) => {
    const health = await verifyHealth();
    const isHealthy = health.postgres && health.redis;
    return reply.status(isHealthy ? 200 : 503).send({
      status: isHealthy ? 'ONLINE' : 'OFFLINE',
      services: health,
      timestamp: new Date().toISOString(),
    });
  });

  // --------------------------------------------------------------------------
  // AUTHENTICATION ROUTES
  // --------------------------------------------------------------------------

  // POST /auth/register (Real account creation)
  fastify.post<{
    Body: {
      name: string;
      email: string;
      password: string;
      role?: UserRole;
      organization_name?: string;
      phone?: string;
      avatar_url?: string;
    };
  }>(
    '/auth/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 255 },
            email: { type: 'string', minLength: 5, maxLength: 255 },
            password: { type: 'string', minLength: 6, maxLength: 128 },
            role: { type: 'string', enum: ['ADMIN', 'AUDITOR', 'OPERATOR'] },
            organization_name: { type: 'string', maxLength: 255 },
            phone: { type: 'string', maxLength: 30 },
            avatar_url: { type: 'string', maxLength: 500 },
          },
        },
      },
    },
    async (request, reply) => {
      const result = await authService.register(request.body);
      return reply.status(201).send(result);
    }
  );

  // POST /auth/login (Real email & password login)
  fastify.post<{
    Body: {
      email: string;
      password: string;
    };
  }>(
    '/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', minLength: 5, maxLength: 255 },
            password: { type: 'string', minLength: 1, maxLength: 128 },
          },
        },
      },
    },
    async (request, reply) => {
      const result = await authService.loginWithEmail(request.body);
      return reply.status(200).send(result);
    }
  );

  // PUT /auth/profile (Update authenticated user profile)
  fastify.put<{
    Body: {
      name?: string;
      phone?: string;
      avatar_url?: string;
    };
  }>(
    '/auth/profile',
    async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new LedgerError(401, 'Authorization header missing or invalid format.');
      }
      const token = authHeader.slice(7).trim();
      const payload = authService.verifyToken(token);
      const updatedUser = await authService.updateProfile(payload.id, request.body || {});
      return reply.status(200).send(updatedUser);
    }
  );

  // POST /auth/phone/send-otp
  fastify.post<{
    Body: { phone: string };
  }>(
    '/auth/phone/send-otp',
    {
      schema: {
        body: {
          type: 'object',
          required: ['phone'],
          properties: {
            phone: { type: 'string', minLength: 8, maxLength: 30 },
          },
        },
      },
    },
    async (request, reply) => {
      const result = await authService.sendPhoneOtp(request.body.phone);
      return reply.status(200).send(result);
    }
  );

  // POST /auth/phone/verify-otp
  fastify.post<{
    Body: { phone: string; otp: string; name?: string };
  }>(
    '/auth/phone/verify-otp',
    {
      schema: {
        body: {
          type: 'object',
          required: ['phone', 'otp'],
          properties: {
            phone: { type: 'string', minLength: 8, maxLength: 30 },
            otp: { type: 'string', minLength: 4, maxLength: 8 },
            name: { type: 'string', maxLength: 100 },
          },
        },
      },
    },
    async (request, reply) => {
      const { phone, otp, name } = request.body;
      const result = await authService.verifyPhoneOtp(phone, otp, name);
      return reply.status(200).send(result);
    }
  );

  // POST /auth/google
  fastify.post<{
    Body: {
      credential?: string;
      email?: string;
      name?: string;
      avatar_url?: string;
      google_id?: string;
    };
  }>(
    '/auth/google',
    async (request, reply) => {
      const result = await authService.loginWithGoogle(request.body || {});
      return reply.status(200).send(result);
    }
  );

  // POST /auth/demo
  fastify.post<{
    Body: { role?: UserRole };
  }>(
    '/auth/demo',
    async (request, reply) => {
      const role = request.body?.role || 'ADMIN';
      const result = await authService.demoLogin(role);
      return reply.status(200).send(result);
    }
  );

  // GET /auth/me
  fastify.get('/auth/me', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new LedgerError(401, 'Authorization header missing or invalid format.');
    }
    const token = authHeader.slice(7).trim();
    const payload = authService.verifyToken(token);
    const user = await authService.getCurrentUser(payload.id);
    return reply.status(200).send(user);
  });

  // --------------------------------------------------------------------------
  // GET /accounts
  // List all accounts in the chart of accounts
  // --------------------------------------------------------------------------
  fastify.get('/accounts', async (_req, reply) => {
    const accounts = await ledgerService.listAccounts();
    return reply.status(200).send(accounts);
  });

  // --------------------------------------------------------------------------
  // POST /accounts
  // Create a new chart-of-accounts entry
  // --------------------------------------------------------------------------
  fastify.post<{
    Body: {
      name: string;
      type: AccountType;
      currency: string;
      allow_overdraft?: boolean;
    };
  }>(
    '/accounts',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'type', 'currency'],
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            type: {
              type: 'string',
              enum: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'],
            },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
            allow_overdraft: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const account = await ledgerService.createAccount(request.body);
      return reply.status(201).send(account);
    }
  );

  // --------------------------------------------------------------------------
  // GET /accounts/:id/statement
  // Chronological statement drilldown with running balance and counterparties
  // --------------------------------------------------------------------------
  fastify.get<{
    Params: { id: string };
  }>(
    '/accounts/:id/statement',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const statement = await ledgerService.getAccountStatement(request.params.id);
      return reply.status(200).send(statement);
    }
  );

  // --------------------------------------------------------------------------
  // GET /transactions
  // List recent double-entry transactions
  // --------------------------------------------------------------------------
  fastify.get<{
    Querystring: { limit?: number };
  }>('/transactions', async (request, reply) => {
    const limit = request.query?.limit ? Number(request.query.limit) : 50;
    const transactions = await ledgerService.listTransactions(limit);
    return reply.status(200).send(transactions);
  });

  // --------------------------------------------------------------------------
  // POST /transactions
  // Post an immutable double-entry transaction
  // --------------------------------------------------------------------------
  fastify.post<{
    Headers: { 'idempotency-key': string };
    Body: PostTransactionDTO;
  }>(
    '/transactions',
    {
      schema: {
        headers: {
          type: 'object',
          required: ['idempotency-key'],
          properties: {
            'idempotency-key': { type: 'string', minLength: 1, maxLength: 255 },
          },
        },
        body: {
          type: 'object',
          required: ['description', 'entries'],
          additionalProperties: false,
          properties: {
            description: { type: 'string', minLength: 1 },
            posted_at: { type: 'string', format: 'date-time' },
            entries: {
              type: 'array',
              minItems: 2,
              items: {
                type: 'object',
                required: ['account_id', 'entry_type', 'amount'],
                additionalProperties: false,
                properties: {
                  account_id: { type: 'string', format: 'uuid' },
                  entry_type: { type: 'string', enum: ['DEBIT', 'CREDIT'] },
                  amount: {
                    anyOf: [
                      { type: 'integer', minimum: 1 },
                      { type: 'string', pattern: '^[1-9][0-9]*$' },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const idempotencyKey = request.headers['idempotency-key'];
      const userId = extractOptionalUserId(request);
      const result = await ledgerService.postTransaction(idempotencyKey, request.body, userId);
      return reply.status(200).send(result);
    }
  );

  // --------------------------------------------------------------------------
  // GET /accounts/:id/balance
  // Fetch real-time current balance
  // --------------------------------------------------------------------------
  fastify.get<{
    Params: { id: string };
  }>(
    '/accounts/:id/balance',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const result = await ledgerService.getCurrentBalance(request.params.id);
      return reply.status(200).send(result);
    }
  );

  // --------------------------------------------------------------------------
  // GET /accounts/:id/time-travel?asOf=ISO_TIMESTAMP
  // Deterministic replay engine
  // --------------------------------------------------------------------------
  fastify.get<{
    Params: { id: string };
    Querystring: { asOf: string };
  }>(
    '/accounts/:id/time-travel',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          required: ['asOf'],
          properties: {
            asOf: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    async (request, reply) => {
      const parsedDate = new Date(request.query.asOf);
      if (isNaN(parsedDate.getTime())) {
        throw new LedgerError(400, "Invalid timestamp format for 'asOf'. Must be valid ISO 8601 string.");
      }
      const result = await ledgerService.timeTravelReplay(request.params.id, parsedDate);
      return reply.status(200).send(result);
    }
  );

  // --------------------------------------------------------------------------
  // GET /ledger/verify-integrity
  // Cryptographic tamper-evident hash chain verification
  // --------------------------------------------------------------------------
  fastify.get('/ledger/verify-integrity', async (_req, reply) => {
    const verification = await ledgerService.verifyIntegrity();
    const statusCode = verification.status === 'VALID' ? 200 : 409;
    return reply.status(statusCode).send(verification);
  });
}
