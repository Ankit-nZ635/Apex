import { createHash, randomUUID } from 'crypto';
import { PoolClient } from 'pg';
import { pgPool, withTransaction, redis } from './db';
import {
  Account,
  AccountType,
  EntryType,
  PostTransactionDTO,
  Transaction,
  TimeTravelReplayResult,
  TimeTravelAuditEvent,
  IntegrityVerificationResult,
  IntegrityBlock,
  AccountStatementResult,
  AccountStatementEntry,
} from './types';

// Canonical Genesis Hash (64 zeros) for the hash-chain root
const GENESIS_PREV_HASH = '0'.repeat(64);
const SNAPSHOT_THRESHOLD = 50; // Trigger snapshot every 50 ledger events on an account
const ADVISORY_LOCK_CHAIN_ID = 1001; // Transaction-scoped advisory lock to serialize cryptographic hash chaining

export class LedgerError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'LedgerError';
  }
}

/**
 * Computes deterministic SHA-256 hash for a transaction.
 * Canonically sorts entries to ensure bit-level reproducibility across nodes.
 */
export function computeTransactionHash(
  prevHash: string,
  txId: string,
  postedAt: string,
  entries: { account_id: string; entry_type: EntryType; amount: string }[]
): string {
  // Sort entries canonically by account_id -> entry_type -> amount
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.account_id !== b.account_id) return a.account_id.localeCompare(b.account_id);
    if (a.entry_type !== b.entry_type) return a.entry_type.localeCompare(b.entry_type);
    return a.amount.localeCompare(b.amount);
  });

  const payload = `${prevHash}|${txId}|${postedAt}|${JSON.stringify(sortedEntries)}`;
  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Calculate net delta for an account based on its normal accounting balance.
 * Normal Balance Rules:
 * - ASSET & EXPENSE: Normal DEBIT balance. DEBIT is (+), CREDIT is (-).
 * - LIABILITY, EQUITY & REVENUE: Normal CREDIT balance. CREDIT is (+), DEBIT is (-).
 */
export function calculateNetDelta(
  accountType: AccountType,
  entryType: EntryType,
  amount: bigint
): bigint {
  if (accountType === 'ASSET' || accountType === 'EXPENSE') {
    return entryType === 'DEBIT' ? amount : -amount;
  } else {
    return entryType === 'CREDIT' ? amount : -amount;
  }
}

export class LedgerService {
  /**
   * Create a new Account in the Chart of Accounts
   */
  async createAccount(data: {
    name: string;
    type: AccountType;
    currency: string;
    allow_overdraft?: boolean;
  }): Promise<Account> {
    const currency = data.currency.trim().toUpperCase();
    if (currency.length !== 3) {
      throw new LedgerError(400, 'Currency must be an ISO 3-character code (e.g. USD, INR).');
    }

    const res = await pgPool.query<Account>(
      `INSERT INTO accounts (name, type, currency, allow_overdraft)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, type, currency, allow_overdraft, event_count, created_at`,
      [data.name.trim(), data.type, currency, !!data.allow_overdraft]
    );

    return { ...res.rows[0], balance: '0' };
  }

  /**
   * List all accounts with real-time calculated balances
   */
  async listAccounts(): Promise<Account[]> {
    const res = await pgPool.query<Account>(
      `SELECT 
         a.id, a.name, a.type, a.currency, a.allow_overdraft, a.event_count, a.created_at,
         COALESCE(
           (
             SELECT 
               CASE 
                 WHEN a.type IN ('ASSET', 'EXPENSE') THEN
                   SUM(CASE WHEN le.entry_type = 'DEBIT' THEN le.amount ELSE -le.amount END)
                 ELSE
                   SUM(CASE WHEN le.entry_type = 'CREDIT' THEN le.amount ELSE -le.amount END)
               END
             FROM ledger_entries le
             WHERE le.account_id = a.id
           ),
           0
         )::text AS balance
       FROM accounts a
       ORDER BY a.created_at ASC`
    );
    return res.rows;
  }

  /**
   * List recent transactions with entries and immutable creator audit trail
   */
  async listTransactions(limit = 50): Promise<any[]> {
    const res = await pgPool.query(
      `SELECT t.id, t.idempotency_key, t.description, t.posted_at, t.prev_hash, t.hash, t.sequence_num::text,
              t.created_by_user_id,
              CASE WHEN u.id IS NOT NULL THEN
                json_build_object(
                  'id', u.id,
                  'name', u.name,
                  'email', u.email,
                  'avatar_url', u.avatar_url,
                  'role', u.role
                )
              ELSE NULL END as creator,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', le.id,
                    'account_id', le.account_id,
                    'account_name', acc.name,
                    'entry_type', le.entry_type,
                    'amount', le.amount::text,
                    'sequence_num', le.sequence_num::text,
                    'created_at', le.created_at
                  ) ORDER BY le.sequence_num ASC
                ) FILTER (WHERE le.id IS NOT NULL), '[]'
              ) as entries
       FROM transactions t
       LEFT JOIN users u ON t.created_by_user_id = u.id
       LEFT JOIN ledger_entries le ON t.id = le.transaction_id
       LEFT JOIN accounts acc ON le.account_id = acc.id
       GROUP BY t.id, u.id
       ORDER BY t.sequence_num DESC
       LIMIT $1`,
      [limit]
    );
    return res.rows;
  }

  /**
   * Post a Double-Entry Transaction enforcing all 4 core invariants:
   * - Invariant 1: In-memory pre-computation of hash & UUID, single-pass zero-UPDATE insert.
   * - Invariant 2: Mathematical equality sum(DEBIT) == sum(CREDIT), deadlock-free ordered row locks,
   *                422 error on overdraft violations.
   * - Invariant 3: Snapshots generated synchronously every 50 events per account.
   * - Invariant 4: Redis distributed lock (\`idemp:lock:<key>\`) + 24h response cache (\`idemp:res:<key>\`).
   */
  async postTransaction(
    idempotencyKey: string,
    payload: PostTransactionDTO,
    createdByUserId?: string
  ): Promise<{ transaction: any; entries: any[]; cached?: boolean; is_idempotent_replay?: boolean }> {
    const trimmedKey = idempotencyKey?.trim();
    if (!trimmedKey) {
      throw new LedgerError(400, 'Header Idempotency-Key is required.');
    }

    // ------------------------------------------------------------------------
    // Invariant 2: Mathematical Balance & Entries Validation
    // ------------------------------------------------------------------------
    if (!payload.entries || payload.entries.length < 2) {
      throw new LedgerError(400, 'Invariant Violation: Transaction MUST consist of at least 2 ledger entries.');
    }

    let totalDebit = 0n;
    let totalCredit = 0n;

    for (const entry of payload.entries) {
      const amt = BigInt(entry.amount);
      if (amt <= 0n) {
        throw new LedgerError(400, `Invariant Violation: Entry amount must be a positive integer in minor units. Received: ${entry.amount}`);
      }
      if (entry.entry_type === 'DEBIT') {
        totalDebit += amt;
      } else if (entry.entry_type === 'CREDIT') {
        totalCredit += amt;
      } else {
        throw new LedgerError(400, `Invalid entry_type: ${entry.entry_type}. Must be DEBIT or CREDIT.`);
      }
    }

    if (totalDebit !== totalCredit) {
      throw new LedgerError(
        400,
        `Invariant Violation: Double-Entry unbalanced. SUM(Debit): ${totalDebit} != SUM(Credit): ${totalCredit}. Net imbalance: ${totalDebit - totalCredit}`
      );
    }

    // ------------------------------------------------------------------------
    // Invariant 4: Redis Idempotency Lock & Cache Layer
    // Keys: idemp:lock:<key> (Distributed Lease), idemp:res:<key> (24h Cache)
    // ------------------------------------------------------------------------
    const lockKey = `idemp:lock:${trimmedKey}`;
    const cacheKey = `idemp:res:${trimmedKey}`;

    // Check cached response first
    const cachedResponse = await redis.get(cacheKey);
    if (cachedResponse) {
      try {
        const parsed = JSON.parse(cachedResponse);
        return {
          ...parsed,
          cached: true,
          is_idempotent_replay: true,
        };
      } catch (err) {
        // Fall through to database
      }
    }

    // Acquire distributed lock for idempotency with a 60-second lease
    const lockAcquired = await redis.set(lockKey, '1', 'EX', 60, 'NX');
    if (!lockAcquired) {
      // Re-check cached response in case concurrent request finished
      const secondCheck = await redis.get(cacheKey);
      if (secondCheck) {
        const parsed = JSON.parse(secondCheck);
        return {
          ...parsed,
          cached: true,
          is_idempotent_replay: true,
        };
      }
      throw new LedgerError(409, 'Conflict: Transaction with this Idempotency-Key is currently in-flight.');
    }

    try {
      const result = await withTransaction(async (client: PoolClient) => {
        // 1. Check idempotency in PostgreSQL (Defense-in-depth)
        const existingTx = await client.query(
          `SELECT t.id, t.idempotency_key, t.description, t.posted_at, t.prev_hash, t.hash, t.sequence_num::text,
                  t.created_by_user_id,
                  CASE WHEN u.id IS NOT NULL THEN
                    json_build_object(
                      'id', u.id,
                      'name', u.name,
                      'email', u.email,
                      'avatar_url', u.avatar_url,
                      'role', u.role
                    )
                  ELSE NULL END as creator,
                  COALESCE(
                    json_agg(
                      json_build_object(
                        'id', le.id,
                        'account_id', le.account_id,
                        'entry_type', le.entry_type,
                        'amount', le.amount::text,
                        'sequence_num', le.sequence_num::text,
                        'created_at', le.created_at
                      ) ORDER BY le.sequence_num ASC
                    ) FILTER (WHERE le.id IS NOT NULL), '[]'
                  ) as entries
           FROM transactions t
           LEFT JOIN users u ON t.created_by_user_id = u.id
           LEFT JOIN ledger_entries le ON t.id = le.transaction_id
           WHERE t.idempotency_key = $1
           GROUP BY t.id, u.id`,
          [trimmedKey]
        );

        if (existingTx.rows.length > 0) {
          const row = existingTx.rows[0];
          return {
            transaction: {
              id: row.id,
              idempotency_key: row.idempotency_key,
              description: row.description,
              posted_at: row.posted_at,
              prev_hash: row.prev_hash,
              hash: row.hash,
              sequence_num: row.sequence_num,
              created_by_user_id: row.created_by_user_id,
              creator: row.creator,
            },
            entries: row.entries,
            cached: true,
            is_idempotent_replay: true,
          };
        }

        // --------------------------------------------------------------------
        // Deadlock-Free Pessimistic Row Locking:
        // Extract distinct account IDs and sort them alphabetically (localeCompare)
        // to prevent 40P01 deadlocks across concurrent transactions.
        // --------------------------------------------------------------------
        const uniqueAccountIds = Array.from(new Set(payload.entries.map((e) => e.account_id)))
          .sort((a, b) => a.localeCompare(b));

        const accountsRes = await client.query<Account>(
          `SELECT id, name, type, currency, allow_overdraft, event_count, created_at 
           FROM accounts 
           WHERE id = ANY($1::uuid[]) 
           ORDER BY id ASC FOR UPDATE`,
          [uniqueAccountIds]
        );

        if (accountsRes.rows.length !== uniqueAccountIds.length) {
          const foundIds = new Set(accountsRes.rows.map((a) => a.id));
          const missingIds = uniqueAccountIds.filter((id) => !foundIds.has(id));
          throw new LedgerError(404, `Accounts not found: ${missingIds.join(', ')}`);
        }

        const accountMap = new Map<string, Account>();
        let targetCurrency: string | null = null;

        for (const acc of accountsRes.rows) {
          accountMap.set(acc.id, acc);
          if (targetCurrency === null) {
            targetCurrency = acc.currency;
          } else if (acc.currency !== targetCurrency) {
            throw new LedgerError(
              400,
              `Currency Mismatch: All accounts in transaction must share currency ${targetCurrency}. Account '${acc.name}' has ${acc.currency}.`
            );
          }
        }

        // --------------------------------------------------------------------
        // Balance Validation & Overdraft Prevention
        // Reject with 422 Unprocessable Entity if allow_overdraft === false and balance < 0
        // --------------------------------------------------------------------
        const deltas = new Map<string, bigint>();
        for (const entry of payload.entries) {
          const acc = accountMap.get(entry.account_id)!;
          const delta = calculateNetDelta(acc.type, entry.entry_type, BigInt(entry.amount));
          deltas.set(entry.account_id, (deltas.get(entry.account_id) || 0n) + delta);
        }

        const currentBalances = new Map<string, bigint>();
        for (const [accountId, txDelta] of deltas.entries()) {
          const acc = accountMap.get(accountId)!;
          const currentBal = await this.computeCurrentBalanceForUpdate(client, accountId, acc.type);
          currentBalances.set(accountId, currentBal);

          const projectedBalance = currentBal + txDelta;

          if (!acc.allow_overdraft && projectedBalance < 0n) {
            throw new LedgerError(
              422,
              `Unprocessable Entity: Insufficient funds for account '${acc.name}' (${acc.id}). Balance cannot be negative. Current: ${currentBal}, net delta: ${txDelta}, projected: ${projectedBalance}`
            );
          }
        }

        // --------------------------------------------------------------------
        // Cryptographic Hash Chaining:
        // Acquire transaction-scoped advisory lock (1001) to serialize hash chain tail
        // --------------------------------------------------------------------
        await client.query('SELECT pg_advisory_xact_lock($1)', [ADVISORY_LOCK_CHAIN_ID]);

        const prevTxRes = await client.query<{ hash: string }>(
          `SELECT hash FROM transactions ORDER BY transactions.sequence_num DESC LIMIT 1`
        );
        const prevHash = prevTxRes.rows.length > 0 ? prevTxRes.rows[0].hash : GENESIS_PREV_HASH;

        const postedAtDate = payload.posted_at ? new Date(payload.posted_at) : new Date();
        const postedAtIso = postedAtDate.toISOString();

        // Pre-compute transaction UUID & SHA-256 hash in memory (Invariant 1: Zero UPDATEs)
        const transactionId = randomUUID();

        const entriesForHash = payload.entries.map((e) => ({
          account_id: e.account_id,
          entry_type: e.entry_type,
          amount: BigInt(e.amount).toString(),
        }));

        const calculatedHash = computeTransactionHash(
          prevHash,
          transactionId,
          postedAtIso,
          entriesForHash
        );

        // Single-pass atomic INSERT into transactions
        const txInsertRes = await client.query<Transaction>(
          `INSERT INTO transactions (id, idempotency_key, description, posted_at, prev_hash, hash, created_by_user_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, idempotency_key, description, posted_at, prev_hash, hash, sequence_num::text, created_by_user_id`,
          [transactionId, trimmedKey, payload.description, postedAtIso, prevHash, calculatedHash, createdByUserId || null]
        );
        const transaction = txInsertRes.rows[0];

        // Insert ledger entries
        const insertedEntries: any[] = [];
        for (const entry of payload.entries) {
          const entryRes = await client.query(
            `INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount)
             VALUES ($1, $2, $3, $4)
             RETURNING id, transaction_id, account_id, entry_type, amount::text, sequence_num::text, created_at`,
            [transactionId, entry.account_id, entry.entry_type, BigInt(entry.amount).toString()]
          );
          insertedEntries.push(entryRes.rows[0]);
        }

        // --------------------------------------------------------------------
        // Invariant 3: In-Transaction Synchronous Snapshotting
        // Every 50 events on an account, insert into account_snapshots
        // --------------------------------------------------------------------
        const eventsPerAccount = new Map<string, number>();
        for (const entry of payload.entries) {
          eventsPerAccount.set(
            entry.account_id,
            (eventsPerAccount.get(entry.account_id) || 0) + 1
          );
        }

        for (const [accountId, addedEvents] of eventsPerAccount.entries()) {
          const acc = accountMap.get(accountId)!;
          const updatedEventCount = (acc.event_count || 0) + addedEvents;

          // Update event_count on accounts
          await client.query(
            `UPDATE accounts SET event_count = $1 WHERE id = $2`,
            [updatedEventCount, accountId]
          );

          // Check if threshold crossed
          if (Math.floor(updatedEventCount / SNAPSHOT_THRESHOLD) > Math.floor((acc.event_count || 0) / SNAPSHOT_THRESHOLD)) {
            // Find highest sequence_num for this account
            const maxSeqRes = await client.query<{ max_seq: string }>(
              `SELECT MAX(sequence_num) as max_seq FROM ledger_entries WHERE account_id = $1`,
              [accountId]
            );
            const maxSeq = maxSeqRes.rows[0]?.max_seq ? BigInt(maxSeqRes.rows[0].max_seq) : 0n;

            // Balance at this point
            const currentBal = currentBalances.get(accountId) || 0n;
            const netTxDelta = deltas.get(accountId) || 0n;
            const finalBal = currentBal + netTxDelta;

            await client.query(
              `INSERT INTO account_snapshots (account_id, balance, last_sequence_num, snapshot_at)
               VALUES ($1, $2, $3, clock_timestamp())`,
              [accountId, finalBal.toString(), maxSeq.toString()]
            );
          }
        }

        let creator: any = null;
        if (createdByUserId) {
          const uRes = await client.query(
            `SELECT id, name, email, avatar_url, role FROM users WHERE id = $1`,
            [createdByUserId]
          );
          if (uRes.rows.length > 0) creator = uRes.rows[0];
        }

        return {
          transaction: { ...transaction, creator },
          entries: insertedEntries,
          cached: false,
          is_idempotent_replay: false,
        };
      });

      // Cache completed response in Redis with 24h TTL (86400 seconds)
      await redis.set(cacheKey, JSON.stringify(result), 'EX', 86400);

      return result;
    } finally {
      // Always release distributed lock
      await redis.del(lockKey);
    }
  }

  /**
   * Internal balance computer used strictly during row-locked transaction checks
   */
  private async computeCurrentBalanceForUpdate(
    client: PoolClient,
    accountId: string,
    accountType: AccountType
  ): Promise<bigint> {
    // 1. Get nearest snapshot
    const snapRes = await client.query<{ balance: string; last_sequence_num: string }>(
      `SELECT balance, last_sequence_num
       FROM account_snapshots
       WHERE account_id = $1
       ORDER BY snapshot_at DESC, last_sequence_num DESC
       LIMIT 1`,
      [accountId]
    );

    let balance = snapRes.rows.length > 0 ? BigInt(snapRes.rows[0].balance) : 0n;
    const startSeq = snapRes.rows.length > 0 ? BigInt(snapRes.rows[0].last_sequence_num) : 0n;

    // 2. Query entries after snapshot
    const entriesRes = await client.query<{ entry_type: EntryType; amount: string }>(
      `SELECT entry_type, amount
       FROM ledger_entries
       WHERE account_id = $1 AND sequence_num > $2
       ORDER BY sequence_num ASC`,
      [accountId, startSeq.toString()]
    );

    for (const row of entriesRes.rows) {
      const delta = calculateNetDelta(accountType, row.entry_type, BigInt(row.amount));
      balance += delta;
    }

    return balance;
  }

  /**
   * Deterministic Time-Travel Replay Engine (Invariant 3)
   * Reconstructs account state precisely as of timestamp \`T\` by reading the nearest
   * preceding snapshot and applying delta events sequentially up to \`T\`.
   */
  async timeTravelReplay(accountId: string, asOf: Date): Promise<TimeTravelReplayResult> {
    // 1. Fetch account metadata
    const accRes = await pgPool.query<Account>(
      `SELECT id, name, type, currency, allow_overdraft, event_count, created_at FROM accounts WHERE id = $1`,
      [accountId]
    );
    if (accRes.rows.length === 0) {
      throw new LedgerError(404, `Account ${accountId} not found.`);
    }
    const account = accRes.rows[0];

    const targetTimestampIso = asOf.toISOString();

    // 2. Fetch nearest preceding snapshot where snapshot_at <= targetTimestamp
    const snapshotRes = await pgPool.query<{
      id: string;
      balance: string;
      last_sequence_num: string;
      snapshot_at: Date;
    }>(
      `SELECT id, balance, last_sequence_num, snapshot_at
       FROM account_snapshots
       WHERE account_id = $1 AND snapshot_at <= $2
       ORDER BY snapshot_at DESC, last_sequence_num DESC
       LIMIT 1`,
      [accountId, targetTimestampIso]
    );

    let currentBalance = 0n;
    let startSeqNumber = 0n;
    let snapshotUsed: TimeTravelReplayResult['snapshot_used'] = null;

    if (snapshotRes.rows.length > 0) {
      const snap = snapshotRes.rows[0];
      currentBalance = BigInt(snap.balance);
      startSeqNumber = BigInt(snap.last_sequence_num);
      snapshotUsed = {
        id: snap.id,
        balance: snap.balance,
        last_sequence_num: snap.last_sequence_num,
        snapshot_at: snap.snapshot_at.toISOString(),
      };
    }

    // 3. Sequentially stream all ledger entries strictly between snapshot sequence and asOf
    const entriesRes = await pgPool.query<{
      entry_id: string;
      transaction_id: string;
      entry_type: EntryType;
      amount: string;
      sequence_num: string;
      posted_at: Date;
      description: string;
    }>(
      `SELECT 
         le.id AS entry_id,
         le.transaction_id,
         le.entry_type,
         le.amount,
         le.sequence_num,
         t.posted_at,
         t.description
       FROM ledger_entries le
       JOIN transactions t ON le.transaction_id = t.id
       WHERE le.account_id = $1
         AND le.sequence_num > $2
         AND t.posted_at <= $3
       ORDER BY le.sequence_num ASC`,
      [accountId, startSeqNumber.toString(), targetTimestampIso]
    );

    // 4. Sequentially fold deltas to reconstruct state
    const auditEvents: TimeTravelAuditEvent[] = [];

    for (const row of entriesRes.rows) {
      const delta = calculateNetDelta(account.type, row.entry_type, BigInt(row.amount));
      currentBalance += delta;

      auditEvents.push({
        entry_id: row.entry_id,
        transaction_id: row.transaction_id,
        sequence_num: row.sequence_num,
        posted_at: row.posted_at.toISOString(),
        entry_type: row.entry_type,
        amount: row.amount,
        running_balance: currentBalance.toString(),
        description: row.description,
      });
    }

    return {
      account_id: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      as_of: targetTimestampIso,
      snapshot_used: snapshotUsed,
      delta_entries_count: entriesRes.rows.length,
      calculated_balance: currentBalance.toString(),
      audit_events: auditEvents,
    };
  }

  /**
   * Fetch current balance for an account
   */
  async getCurrentBalance(accountId: string): Promise<TimeTravelReplayResult> {
    return this.timeTravelReplay(accountId, new Date());
  }

  /**
   * Complete chronological Account Statement with running balance and counterparties
   */
  async getAccountStatement(accountId: string): Promise<AccountStatementResult> {
    const accRes = await pgPool.query<Account>(
      `SELECT id, name, type, currency, allow_overdraft, event_count, created_at FROM accounts WHERE id = $1`,
      [accountId]
    );
    if (accRes.rows.length === 0) {
      throw new LedgerError(404, `Account ${accountId} not found.`);
    }
    const account = accRes.rows[0];

    const entriesRes = await pgPool.query<{
      entry_id: string;
      transaction_id: string;
      sequence_num: string;
      entry_type: EntryType;
      amount: string;
      posted_at: Date;
      description: string;
    }>(
      `SELECT 
         le.id AS entry_id,
         le.transaction_id,
         le.sequence_num::text,
         le.entry_type,
         le.amount::text,
         t.posted_at,
         t.description
       FROM ledger_entries le
       JOIN transactions t ON le.transaction_id = t.id
       WHERE le.account_id = $1
       ORDER BY le.sequence_num ASC`,
      [accountId]
    );

    const snapRes = await pgPool.query<{ last_sequence_num: string }>(
      `SELECT last_sequence_num::text FROM account_snapshots WHERE account_id = $1`,
      [accountId]
    );
    const snapshotSeqSet = new Set(snapRes.rows.map((r) => r.last_sequence_num));

    const txIds = Array.from(new Set(entriesRes.rows.map((r) => r.transaction_id)));
    const counterpartyMap = new Map<string, string[]>();
    if (txIds.length > 0) {
      const cpRes = await pgPool.query<{ transaction_id: string; account_name: string }>(
        `SELECT le.transaction_id, a.name AS account_name
         FROM ledger_entries le
         JOIN accounts a ON le.account_id = a.id
         WHERE le.transaction_id = ANY($1::uuid[]) AND le.account_id != $2`,
        [txIds, accountId]
      );
      for (const row of cpRes.rows) {
        const list = counterpartyMap.get(row.transaction_id) || [];
        list.push(row.account_name);
        counterpartyMap.set(row.transaction_id, list);
      }
    }

    let runningBal = 0n;
    const statement: AccountStatementEntry[] = [];

    for (const row of entriesRes.rows) {
      const delta = calculateNetDelta(account.type, row.entry_type, BigInt(row.amount));
      runningBal += delta;
      statement.push({
        entry_id: row.entry_id,
        transaction_id: row.transaction_id,
        sequence_num: row.sequence_num,
        posted_at: row.posted_at.toISOString(),
        entry_type: row.entry_type,
        amount: row.amount,
        running_balance: runningBal.toString(),
        description: row.description,
        counterparty_accounts: counterpartyMap.get(row.transaction_id) || [],
        is_snapshot_point: snapshotSeqSet.has(row.sequence_num),
      });
    }

    return {
      account: { ...account, balance: runningBal.toString() },
      current_balance: runningBal.toString(),
      total_entries: statement.length,
      statement,
    };
  }

  /**
   * Cryptographic Ledger Verification
   * Sequentially traverses all transactions ordered by sequence_num ASC,
   * recalculating hashes and verifying tamper-evident continuity from Genesis to Head.
   */
  async verifyIntegrity(): Promise<IntegrityVerificationResult> {
    const txRes = await pgPool.query<{
      id: string;
      description: string;
      posted_at: Date;
      prev_hash: string;
      hash: string;
      sequence_num: string;
    }>(
      `SELECT t.id, t.description, t.posted_at, t.prev_hash, t.hash, t.sequence_num::text
       FROM transactions t
       ORDER BY t.sequence_num ASC`
    );

    if (txRes.rows.length === 0) {
      return {
        status: 'VALID',
        verified_count: 0,
        total_blocks: 0,
        head_hash: null,
        blocks: [],
        total_transactions: 0,
        genesis_hash: null,
        latest_hash: null,
      };
    }

    let expectedPrevHash = GENESIS_PREV_HASH;
    let isCompromised = false;
    let brokenAtTxId: string | null = null;
    let brokenReason = '';
    let brokenExpected = '';
    let brokenActual = '';

    const verifiedBlocks: IntegrityBlock[] = [];

    for (const tx of txRes.rows) {
      const txId = tx.id;
      const postedAtIso = tx.posted_at.toISOString();

      // Fetch entries canonically for this transaction
      const entriesRes = await pgPool.query<{
        account_id: string;
        entry_type: EntryType;
        amount: string;
      }>(
        `SELECT account_id, entry_type, amount::text
         FROM ledger_entries
         WHERE transaction_id = $1
         ORDER BY sequence_num ASC`,
        [txId]
      );

      // Verify prev_hash link
      if (tx.prev_hash !== expectedPrevHash) {
        isCompromised = true;
        brokenAtTxId = txId;
        brokenReason = `Broken Hash Chain: Expected prev_hash '${expectedPrevHash}', found '${tx.prev_hash}'`;
        brokenExpected = expectedPrevHash;
        brokenActual = tx.prev_hash;
        verifiedBlocks.push({
          id: tx.id,
          sequence_num: tx.sequence_num,
          posted_at: postedAtIso,
          prev_hash: tx.prev_hash,
          hash: tx.hash,
          description: tx.description,
          verified: false,
          compromised: true,
        });
        break;
      }

      // Recalculate transaction hash in memory
      const calculatedHash = computeTransactionHash(
        tx.prev_hash,
        txId,
        postedAtIso,
        entriesRes.rows
      );

      if (tx.hash !== calculatedHash) {
        isCompromised = true;
        brokenAtTxId = txId;
        brokenReason = `Hash Mismatch: Payload compromised. Expected '${calculatedHash}', recorded '${tx.hash}'`;
        brokenExpected = calculatedHash;
        brokenActual = tx.hash;
        verifiedBlocks.push({
          id: tx.id,
          sequence_num: tx.sequence_num,
          posted_at: postedAtIso,
          prev_hash: tx.prev_hash,
          hash: tx.hash,
          description: tx.description,
          verified: false,
          compromised: true,
        });
        break;
      }

      // Chain step is valid
      verifiedBlocks.push({
        id: tx.id,
        sequence_num: tx.sequence_num,
        posted_at: postedAtIso,
        prev_hash: tx.prev_hash,
        hash: tx.hash,
        description: tx.description,
        verified: true,
        compromised: false,
      });

      expectedPrevHash = tx.hash;
    }

    const headHash = verifiedBlocks.length > 0 ? verifiedBlocks[verifiedBlocks.length - 1].hash : null;
    const genesisHash = verifiedBlocks.length > 0 ? verifiedBlocks[0].hash : null;

    return {
      status: isCompromised ? 'COMPROMISED' : 'VALID',
      verified_count: verifiedBlocks.filter((b) => b.verified).length,
      total_blocks: txRes.rows.length,
      head_hash: headHash,
      broken_at_tx_id: brokenAtTxId,
      blocks: verifiedBlocks,
      total_transactions: txRes.rows.length,
      genesis_hash: genesisHash,
      latest_hash: headHash,
      ...(isCompromised
        ? {
            broken_link: {
              transaction_id: brokenAtTxId || '',
              reason: brokenReason,
              expected: brokenExpected,
              actual: brokenActual,
            },
          }
        : {}),
    };
  }
}
