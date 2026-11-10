-- ============================================================================
-- AUTHENTICATION & MULTI-TENANT RBAC SCHEMA MIGRATION
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'AUDITOR', 'OPERATOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS users (
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

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Immutable Actor linkage
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON transactions(created_by_user_id);

-- Default Organization
INSERT INTO organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000010', 'Apex Global Treasury Corp', 'apex-global')
ON CONFLICT (slug) DO NOTHING;

-- Seed default users
INSERT INTO users (id, org_id, email, phone, name, avatar_url, role)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'sarah.jenkins@mercury-fintech.io', '+15550199', 'Sarah Jenkins', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'ADMIN'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'alex.rivera@audit.kpmg.com', '+15550188', 'Alex Rivera', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'AUDITOR')
ON CONFLICT (id) DO NOTHING;

