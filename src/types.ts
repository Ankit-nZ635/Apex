export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type EntryType = 'DEBIT' | 'CREDIT';
export type UserRole = 'ADMIN' | 'AUDITOR' | 'OPERATOR';

export interface User {
  id: string;
  org_id?: string | null;
  email?: string | null;
  phone?: string | null;
  name: string;
  avatar_url?: string | null;
  google_id?: string | null;
  role: UserRole;
  created_at: Date | string;
  org_name?: string | null;
  org_slug?: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: Date | string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  allow_overdraft: boolean;
  event_count: number;
  created_at: Date;
  balance?: string;
}

export interface Transaction {
  id: string;
  idempotency_key: string;
  description: string;
  posted_at: Date;
  prev_hash: string;
  hash: string;
  sequence_num: string;
  created_by_user_id?: string | null;
  creator?: {
    id: string;
    name: string;
    email?: string | null;
    avatar_url?: string | null;
    role: UserRole;
  } | null;
}

export interface LedgerEntry {
  id: string;
  transaction_id: string;
  account_id: string;
  entry_type: EntryType;
  amount: bigint | string;
  sequence_num: bigint | string;
  created_at: Date;
}

export interface AccountSnapshot {
  id: string;
  account_id: string;
  balance: bigint | string;
  last_sequence_num: bigint | string;
  snapshot_at: Date;
}

export interface PostingEntryDTO {
  account_id: string;
  entry_type: EntryType;
  amount: number | string; // minor units (e.g. cents)
}

export interface PostTransactionDTO {
  description: string;
  posted_at?: string; // Optional ISO timestamp
  entries: PostingEntryDTO[];
}

export interface TimeTravelAuditEvent {
  entry_id: string;
  transaction_id: string;
  sequence_num: string;
  posted_at: string;
  entry_type: EntryType;
  amount: string;
  running_balance: string;
  description: string;
}

export interface TimeTravelReplayResult {
  account_id: string;
  name: string;
  type: AccountType;
  currency: string;
  as_of: string;
  snapshot_used: {
    id: string;
    balance: string;
    last_sequence_num: string;
    snapshot_at: string;
  } | null;
  delta_entries_count: number;
  calculated_balance: string;
  audit_events: TimeTravelAuditEvent[];
}

export interface AccountStatementEntry {
  entry_id: string;
  transaction_id: string;
  sequence_num: string;
  posted_at: string;
  entry_type: EntryType;
  amount: string;
  running_balance: string;
  description: string;
  counterparty_accounts: string[];
  is_snapshot_point: boolean;
}

export interface AccountStatementResult {
  account: Account;
  current_balance: string;
  total_entries: number;
  statement: AccountStatementEntry[];
}

export interface IntegrityBlock {
  id: string;
  sequence_num: string;
  posted_at: string;
  prev_hash: string;
  hash: string;
  description: string;
  verified: boolean;
  compromised: boolean;
}

export interface IntegrityVerificationResult {
  status: 'VALID' | 'COMPROMISED';
  verified_count: number;
  total_blocks: number;
  head_hash: string | null;
  broken_at_tx_id?: string | null;
  blocks: IntegrityBlock[];
  // Backwards compatibility aliases for dashboard metrics
  total_transactions?: number;
  genesis_hash?: string | null;
  latest_hash?: string | null;
  broken_link?: {
    transaction_id: string;
    reason: string;
    expected: string;
    actual: string;
  };
}
