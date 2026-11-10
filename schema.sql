-- ============================================================================
-- TIME-TRAVEL EVENT-SOURCED DOUBLE-ENTRY LEDGER SCHEMA
-- PostgreSQL 16 Compatible
-- ============================================================================

-- Enable pgcrypto / uuid extensions for ID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean drop for idempotency during migration/testing
DROP TABLE IF EXISTS account_snapshots CASCADE;
DROP TABLE IF EXISTS ledger_entries CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS entry_type CASCADE;
DROP TYPE IF EXISTS account_type CASCADE;

-- ----------------------------------------------------------------------------
-- 1. ENUMS
-- ----------------------------------------------------------------------------
CREATE TYPE account_type AS ENUM (
    'ASSET',
    'LIABILITY',
    'EQUITY',
    'REVENUE',
    'EXPENSE'
);

CREATE TYPE entry_type AS ENUM (
    'DEBIT',
    'CREDIT'
);

CREATE TYPE user_role AS ENUM (
    'ADMIN',
    'AUDITOR',
    'OPERATOR'
);

-- ----------------------------------------------------------------------------
-- 2. ORGANIZATIONS & USERS (Multi-Tenant RBAC)
-- ----------------------------------------------------------------------------
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(30) UNIQUE,
    name VARCHAR(255) NOT NULL,
    password_hash TEXT,
    avatar_url TEXT,
    google_id VARCHAR(255) UNIQUE,
    role user_role NOT NULL DEFAULT 'OPERATOR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_google_id ON users(google_id);

-- Default Organization & Users Seed
INSERT INTO organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000010', 'Apex Global Treasury Corp', 'apex-global')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO users (id, org_id, email, phone, name, avatar_url, role)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'sarah.jenkins@mercury-fintech.io', '+15550199', 'Sarah Jenkins', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'ADMIN'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'alex.rivera@audit.kpmg.com', '+15550188', 'Alex Rivera', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'AUDITOR')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. ACCOUNTS TABLE
-- Represents the chart of accounts.
-- ----------------------------------------------------------------------------
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type account_type NOT NULL,
    currency CHAR(3) NOT NULL CHECK (length(currency) = 3),
    allow_overdraft BOOLEAN NOT NULL DEFAULT FALSE,
    event_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_accounts_currency ON accounts(currency);
CREATE INDEX idx_accounts_type ON accounts(type);

-- ----------------------------------------------------------------------------
-- 4. TRANSACTIONS TABLE
-- Event envelope recording metadata, posted_at, tamper-evident SHA-256 chain,
-- and actor audit linkage.
-- ----------------------------------------------------------------------------
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    posted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    prev_hash CHAR(64) NOT NULL,
    hash CHAR(64) NOT NULL,
    sequence_num BIGSERIAL UNIQUE NOT NULL,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_transactions_posted_at ON transactions(posted_at ASC);
CREATE INDEX idx_transactions_sequence_num ON transactions(sequence_num ASC);
CREATE INDEX idx_transactions_idempotency_key ON transactions(idempotency_key);
CREATE INDEX idx_transactions_created_by ON transactions(created_by_user_id);

-- ----------------------------------------------------------------------------
-- 5. LEDGER ENTRIES TABLE
-- The atomic immutable journal postings. Every economic movement of value is
-- recorded here. Strict Invariant: sum(debit) == sum(credit) across every tx.
-- ----------------------------------------------------------------------------
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    entry_type entry_type NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0), -- Minor currency units (e.g., cents, paise)
    sequence_num BIGSERIAL UNIQUE NOT NULL,    -- Monotonically increasing total ledger sequence
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_ledger_entries_account_seq ON ledger_entries(account_id, sequence_num ASC);
CREATE INDEX idx_ledger_entries_tx_id ON ledger_entries(transaction_id);

-- ----------------------------------------------------------------------------
-- 6. ACCOUNT SNAPSHOTS TABLE
-- Materialized balance checkpoints computed periodically (every 50 events)
-- to allow O(k) bounded-depth deterministic replay during Time-Travel queries.
-- ----------------------------------------------------------------------------
CREATE TABLE account_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    balance BIGINT NOT NULL,
    last_sequence_num BIGINT NOT NULL,
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_account_snapshots_lookup 
    ON account_snapshots(account_id, snapshot_at DESC, last_sequence_num DESC);

-- ----------------------------------------------------------------------------
-- 7. IMMUTABILITY ENFORCEMENT (Invariant 1)
-- Zero UPDATE or DELETE queries permitted on transactions and ledger_entries.
-- Enforced at the database storage engine.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger tables are strictly append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_mutation_transactions
    BEFORE UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

CREATE TRIGGER trg_prevent_mutation_ledger_entries
    BEFORE UPDATE OR DELETE ON ledger_entries
    FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
