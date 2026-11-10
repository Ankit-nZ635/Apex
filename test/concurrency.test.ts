import { buildApp } from '../src/index';
import { pgPool, redis, closePools } from '../src/db';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runConcurrencyTest() {
  console.log('\n=============================================================');
  console.log('⚡ STARTING HIGH-CONCURRENCY LEDGER STRESS TEST (50 CONCURRENT TXS)');
  console.log('=============================================================\n');

  const app = buildApp();
  await app.ready();

  try {
    // ------------------------------------------------------------------------
    // Step 0: Ensure schema is freshly initialized
    // ------------------------------------------------------------------------
    console.log('[Setup] Applying fresh schema DDL...');
    const schemaSql = readFileSync(join(__dirname, '../schema.sql'), 'utf-8');
    await pgPool.query(schemaSql);
    await redis.flushdb();
    console.log('[Setup] Schema applied and Redis cache cleared.\n');

    // ------------------------------------------------------------------------
    // Step 1: Create Test Accounts
    // ------------------------------------------------------------------------
    console.log('[Setup] Creating chart of accounts...');

    // 1. Funding source (Equity)
    const equityRes = await app.inject({
      method: 'POST',
      url: '/accounts',
      payload: { name: 'Initial Capital & Equity', type: 'EQUITY', currency: 'USD' },
    });
    const equityAccount = equityRes.json();

    // 2. Operating Checking (Asset, No overdraft)
    const operatingRes = await app.inject({
      method: 'POST',
      url: '/accounts',
      payload: { name: 'Operating Checking', type: 'ASSET', currency: 'USD', allow_overdraft: false },
    });
    const operatingAccount = operatingRes.json();

    // 3. Merchant Settlement (Asset, No overdraft)
    const merchantRes = await app.inject({
      method: 'POST',
      url: '/accounts',
      payload: { name: 'Merchant Settlement', type: 'ASSET', currency: 'USD', allow_overdraft: false },
    });
    const merchantAccount = merchantRes.json();

    console.log(`[Setup] Created Accounts:
    - Equity:   ${equityAccount.id} (${equityAccount.name})
    - Checking: ${operatingAccount.id} (${operatingAccount.name})
    - Merchant: ${merchantAccount.id} (${merchantAccount.name})\n`);

    // ------------------------------------------------------------------------
    // Step 2: Seed Accounts with Initial Funding from Equity
    // ------------------------------------------------------------------------
    console.log('[Setup] Funding Operating Checking with $1,000.00 (100,000 cents) & Merchant with $500.00 (50,000 cents)...');
    const seedRes = await app.inject({
      method: 'POST',
      url: '/transactions',
      headers: { 'idempotency-key': 'seed-initial-funding-001' },
      payload: {
        description: 'Initial funding for Operating and Merchant accounts',
        entries: [
          { account_id: operatingAccount.id, entry_type: 'DEBIT', amount: 100000 },
          { account_id: merchantAccount.id, entry_type: 'DEBIT', amount: 50000 },
          { account_id: equityAccount.id, entry_type: 'CREDIT', amount: 150000 },
        ],
      },
    });

    if (seedRes.statusCode !== 200) {
      throw new Error(`Failed to seed funding: ${seedRes.body}`);
    }
    console.log('[Setup] Seed transaction successful. Hash:', seedRes.json().transaction.hash, '\n');

    // ------------------------------------------------------------------------
    // TEST 1: Bidirectional Concurrent Transfers (Deadlock Prevention 40P01)
    // 50 concurrent transactions moving funds back and forth in opposite directions:
    // Even index: Operating -> Merchant ($10.00 / 1,000 cents)
    // Odd index:  Merchant -> Operating ($10.00 / 1,000 cents)
    // ------------------------------------------------------------------------
    console.log('-------------------------------------------------------------');
    console.log('TEST 1: 50 Concurrent Bidirectional Transfers (Deadlock Prevention)');
    console.log('-------------------------------------------------------------');

    const totalConcurrentRequests = 50;
    const transferAmount = 1000; // 1,000 cents = $10.00

    const transferPromises = Array.from({ length: totalConcurrentRequests }, (_, i) => {
      const idempotencyKey = `concurrent-bidirectional-tx-${i + 1}`;
      const isEven = i % 2 === 0;

      // Swap source and target to create potential cyclic locking deadlocks
      const sourceId = isEven ? operatingAccount.id : merchantAccount.id;
      const targetId = isEven ? merchantAccount.id : operatingAccount.id;

      return app.inject({
        method: 'POST',
        url: '/transactions',
        headers: { 'idempotency-key': idempotencyKey },
        payload: {
          description: `Bidirectional transfer #${i + 1}: ${isEven ? 'Checking -> Merchant' : 'Merchant -> Checking'}`,
          entries: [
            { account_id: sourceId, entry_type: 'CREDIT', amount: transferAmount },
            { account_id: targetId, entry_type: 'DEBIT', amount: transferAmount },
          ],
        },
      });
    });

    const startConcurrency = Date.now();
    const results = await Promise.all(transferPromises);
    const durationMs = Date.now() - startConcurrency;

    let successCount = 0;
    let deadlockCount = 0;
    let otherErrors = 0;

    for (const res of results) {
      if (res.statusCode === 200) {
        successCount++;
      } else if (res.body.includes('40P01') || res.body.includes('deadlock')) {
        deadlockCount++;
      } else {
        otherErrors++;
        console.error(`Unexpected result [${res.statusCode}]:`, res.body);
      }
    }

    console.log(`[Results in ${durationMs}ms]:`);
    console.log(`- Total Requests Fired: ${totalConcurrentRequests}`);
    console.log(`- Succeeded:            ${successCount} / ${totalConcurrentRequests}`);
    console.log(`- Deadlocks (40P01):    ${deadlockCount} (Expected: 0)`);
    console.log(`- Other Errors:         ${otherErrors}`);

    if (deadlockCount > 0) {
      throw new Error(`FAILURE: Deadlocks detected! Lock order was not strictly normalized.`);
    }
    if (successCount !== totalConcurrentRequests) {
      throw new Error(`FAILURE: Expected all 50 bidirectional transfers to succeed, got ${successCount}`);
    }
    console.log('✅ TEST 1 PASSED: Zero deadlocks under heavy bidirectional concurrency!\n');

    // ------------------------------------------------------------------------
    // TEST 2: Strict Overdraft Protection (422 Unprocessable Entity)
    // Attempt to withdraw $5,000.00 from Operating Checking (which has balance ~ $1,000)
    // ------------------------------------------------------------------------
    console.log('-------------------------------------------------------------');
    console.log('TEST 2: Overdraft Protection (Invariant 2)');
    console.log('-------------------------------------------------------------');

    const overdraftRes = await app.inject({
      method: 'POST',
      url: '/transactions',
      headers: { 'idempotency-key': 'overdraft-illegal-attempt-001' },
      payload: {
        description: 'Illegal overdraft attempt',
        entries: [
          { account_id: operatingAccount.id, entry_type: 'CREDIT', amount: 500000 },
          { account_id: merchantAccount.id, entry_type: 'DEBIT', amount: 50000 },
        ],
      },
    });

    // Note: unbalanced debits vs credits rejected with 400
    // Perfectly balanced but overdrawing rejected with 422
    const balancedOverdraftRes = await app.inject({
      method: 'POST',
      url: '/transactions',
      headers: { 'idempotency-key': 'overdraft-illegal-balanced-001' },
      payload: {
        description: 'Balanced illegal overdraft attempt',
        entries: [
          { account_id: operatingAccount.id, entry_type: 'CREDIT', amount: 500000 },
          { account_id: merchantAccount.id, entry_type: 'DEBIT', amount: 500000 },
        ],
      },
    });

    console.log(`Overdraft status code: ${balancedOverdraftRes.statusCode}`);
    if (balancedOverdraftRes.statusCode !== 422) {
      throw new Error(`Expected 422 Unprocessable Entity, got ${balancedOverdraftRes.statusCode}: ${balancedOverdraftRes.body}`);
    }
    console.log('✅ TEST 2 PASSED: Overdraft strictly rejected with 422 Unprocessable Entity.\n');

    // ------------------------------------------------------------------------
    // TEST 3: Idempotency Verification (Cache & DB fallback)
    // ------------------------------------------------------------------------
    console.log('-------------------------------------------------------------');
    console.log('TEST 3: High-Contention Idempotency Replay (Invariant 4)');
    console.log('-------------------------------------------------------------');

    const testIdempKey = 'idemp-replay-test-key-999';
    const firstCall = await app.inject({
      method: 'POST',
      url: '/transactions',
      headers: { 'idempotency-key': testIdempKey },
      payload: {
        description: 'Single transfer to test idempotency',
        entries: [
          { account_id: operatingAccount.id, entry_type: 'CREDIT', amount: 2500 },
          { account_id: merchantAccount.id, entry_type: 'DEBIT', amount: 2500 },
        ],
      },
    });

    const secondCall = await app.inject({
      method: 'POST',
      url: '/transactions',
      headers: { 'idempotency-key': testIdempKey },
      payload: {
        description: 'Duplicate transfer to test idempotency',
        entries: [
          { account_id: operatingAccount.id, entry_type: 'CREDIT', amount: 2500 },
          { account_id: merchantAccount.id, entry_type: 'DEBIT', amount: 2500 },
        ],
      },
    });

    if (firstCall.statusCode !== 200 || secondCall.statusCode !== 200) {
      throw new Error(`Idempotency call failed: [${firstCall.statusCode}, ${secondCall.statusCode}]`);
    }

    const firstTxId = firstCall.json().transaction.id;
    const secondTxId = secondCall.json().transaction.id;

    if (firstTxId !== secondTxId) {
      throw new Error(`Idempotency failure! Different transaction IDs returned: ${firstTxId} vs ${secondTxId}`);
    }
    console.log(`✅ TEST 3 PASSED: Identical response returned with duplicate key (Tx ID: ${firstTxId})\n`);

    // ------------------------------------------------------------------------
    // TEST 4: Snapshot Generation Verification (Every 50 events)
    // ------------------------------------------------------------------------
    console.log('-------------------------------------------------------------');
    console.log('TEST 4: Materialized Snapshot Generation (Invariant 3)');
    console.log('-------------------------------------------------------------');

    const snapshotsRes = await pgPool.query(
      `SELECT id, account_id, balance, last_sequence_num, snapshot_at FROM account_snapshots`
    );

    console.log(`Account snapshots recorded: ${snapshotsRes.rows.length}`);
    for (const snap of snapshotsRes.rows) {
      console.log(`  - Account: ${snap.account_id} | Balance: ${snap.balance} | SeqNum: ${snap.last_sequence_num}`);
    }

    if (snapshotsRes.rows.length === 0) {
      throw new Error(`Expected at least 1 account snapshot after > 50 events on accounts, found 0`);
    }
    console.log('✅ TEST 4 PASSED: Materialized snapshot recorded as expected.\n');

    // ------------------------------------------------------------------------
    // TEST 5: Cryptographic Hash Chain Continuity & Total Value Conservation
    // ------------------------------------------------------------------------
    console.log('-------------------------------------------------------------');
    console.log('TEST 5: SHA-256 Hash Chain Integrity & Total Value Conservation');
    console.log('-------------------------------------------------------------');

    const integrityRes = await app.inject({
      method: 'GET',
      url: '/ledger/verify-integrity',
    });
    const integrity = integrityRes.json();

    console.log(`Integrity Status: ${integrity.status}`);
    console.log(`Verified Count:   ${integrity.verified_count} / ${integrity.total_blocks}`);
    console.log(`Head Hash:        ${integrity.head_hash?.slice(0, 16)}...`);

    if (integrity.status !== 'VALID') {
      throw new Error(`Hash chain compromised! ${JSON.stringify(integrity)}`);
    }

    // Verify Total Balance Conservation:
    // Initial Equity funded = $1,500.00 (150,000 cents)
    // Total Assets (Checking + Merchant) MUST equal exactly 150,000 cents.
    const opBalRes = await app.inject({ method: 'GET', url: `/accounts/${operatingAccount.id}/balance` });
    const meBalRes = await app.inject({ method: 'GET', url: `/accounts/${merchantAccount.id}/balance` });

    const opBal = BigInt(opBalRes.json().calculated_balance);
    const meBal = BigInt(meBalRes.json().calculated_balance);
    const totalAssetBalance = opBal + meBal;

    console.log(`Operating Balance: ${opBal} cents`);
    console.log(`Merchant Balance:  ${meBal} cents`);
    console.log(`Total Assets:      ${totalAssetBalance} cents (Expected: 150000)`);

    if (totalAssetBalance !== 150000n) {
      throw new Error(`Balance Conservation Failure! Total assets (${totalAssetBalance}) != 150000`);
    }
    console.log('✅ TEST 5 PASSED: Total system economic value is strictly conserved!\n');

    console.log('=============================================================');
    console.log('🎉 ALL 5 CONCURRENCY & LEDGER INVARIANT TESTS PASSED CLEANLY!');
    console.log('=============================================================\n');
  } finally {
    await app.close();
    await closePools();
  }
}

if (require.main === module) {
  runConcurrencyTest();
}
