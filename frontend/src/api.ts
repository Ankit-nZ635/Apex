import axios from 'axios'

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
export type EntryType = 'DEBIT' | 'CREDIT'
export type UserRole = 'ADMIN' | 'AUDITOR' | 'OPERATOR'

export interface User {
  id: string
  org_id?: string | null
  email?: string | null
  phone?: string | null
  name: string
  avatar_url?: string | null
  google_id?: string | null
  role: UserRole
  created_at: string
  org_name?: string | null
  org_slug?: string | null
}

export interface Account {
  id: string
  name: string
  type: AccountType
  currency: string
  allow_overdraft: boolean
  event_count?: number
  created_at: string
  balance?: string
}

export interface AuditEvent {
  entry_id: string
  transaction_id: string
  sequence_num: string
  posted_at: string
  entry_type: EntryType
  amount: string
  running_balance: string
  description: string
}

export interface BalanceResult {
  account_id: string
  name: string
  type: AccountType
  currency: string
  as_of: string
  snapshot_used: {
    id: string
    balance: string
    last_sequence_num: string
    snapshot_at: string
  } | null
  delta_entries_count: number
  calculated_balance: string
  audit_events: AuditEvent[]
}

export interface AccountStatementEntry {
  entry_id: string
  transaction_id: string
  sequence_num: string
  posted_at: string
  entry_type: EntryType
  amount: string
  running_balance: string
  description: string
  counterparty_accounts: string[]
  is_snapshot_point: boolean
}

export interface AccountStatementResult {
  account: Account
  current_balance: string
  total_entries: number
  statement: AccountStatementEntry[]
}

export interface Transaction {
  id: string
  idempotency_key: string
  description: string
  posted_at: string
  prev_hash: string
  hash: string
  sequence_num: string
  created_by_user_id?: string | null
  creator?: {
    id: string
    name: string
    email?: string | null
    avatar_url?: string | null
    role: UserRole
  } | null
  entries?: {
    id: string
    transaction_id?: string
    account_id: string
    account_name?: string
    entry_type: EntryType
    amount: string
    sequence_num: string
    created_at?: string
  }[]
}

export interface IntegrityBlock {
  id: string
  sequence_num: string
  posted_at: string
  prev_hash: string
  hash: string
  description: string
  verified: boolean
  compromised: boolean
}

export interface IntegrityResult {
  status: 'VALID' | 'COMPROMISED'
  verified_count: number
  total_blocks: number
  head_hash: string | null
  broken_at_tx_id?: string | null
  blocks: IntegrityBlock[]
  total_transactions?: number
  genesis_hash?: string | null
  latest_hash?: string | null
  broken_link?: { transaction_id: string; reason: string; expected: string; actual: string }
}

export interface TransactionResult {
  transaction?: Transaction
  id?: string
  idempotency_key?: string
  description?: string
  posted_at?: string
  prev_hash?: string
  hash?: string
  sequence_num?: string
  cached?: boolean
  is_idempotent_replay?: boolean
  entries: {
    id: string
    transaction_id?: string
    account_id: string
    account_name?: string
    entry_type: EntryType
    amount: string
    sequence_num: string
    created_at?: string
  }[]
}

const api = axios.create({ baseURL: '/api' })

// Attach Bearer token automatically if logged in
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ledger_auth_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const ledgerApi = {
  health: () =>
    api.get<{ status: string; services: { postgres: boolean; redis: boolean }; timestamp: string }>('/health'),

  // Auth Endpoints
  register: (data: {
    name: string
    email: string
    password: string
    role?: UserRole
    organization_name?: string
    phone?: string
    avatar_url?: string
  }) => api.post<{ token: string; user: User }>('/auth/register', data),

  loginWithEmail: (data: { email: string; password: string }) =>
    api.post<{ token: string; user: User }>('/auth/login', data),

  updateProfile: (data: { name?: string; phone?: string; avatar_url?: string }) =>
    api.put<User>('/auth/profile', data),

  sendPhoneOtp: (phone: string) =>
    api.post<{ success: boolean; message: string; dev_otp?: string; expires_in: number }>('/auth/phone/send-otp', { phone }),

  verifyPhoneOtp: (phone: string, otp: string, name?: string) =>
    api.post<{ token: string; user: User }>('/auth/phone/verify-otp', { phone, otp, name }),

  googleLogin: (data: { credential?: string; email?: string; name?: string; avatar_url?: string }) =>
    api.post<{ token: string; user: User }>('/auth/google', data),

  demoLogin: (role: UserRole = 'ADMIN') =>
    api.post<{ token: string; user: User }>('/auth/demo', { role }),

  getMe: () =>
    api.get<User>('/auth/me'),

  // Accounts Endpoints
  getAccounts: () =>
    api.get<Account[]>('/accounts').catch(() => ({ data: [] as Account[] })),

  createAccount: (data: { name: string; type: AccountType; currency: string; allow_overdraft?: boolean }) =>
    api.post<Account>('/accounts', data),

  getBalance: (id: string) =>
    api.get<BalanceResult>(`/accounts/${id}/balance`),

  getAccountStatement: (id: string) =>
    api.get<AccountStatementResult>(`/accounts/${id}/statement`),

  timeTravel: (id: string, asOf: string) =>
    api.get<BalanceResult>(`/accounts/${id}/time-travel`, { params: { asOf } }),

  // Transactions Endpoints
  getTransactions: (limit = 50) =>
    api.get<Transaction[]>('/transactions', { params: { limit } }).catch(() => ({ data: [] as Transaction[] })),

  postTransaction: (
    idempotencyKey: string,
    data: { description: string; posted_at?: string; entries: { account_id: string; entry_type: EntryType; amount: number }[] }
  ) =>
    api.post<TransactionResult>('/transactions', data, { headers: { 'Idempotency-Key': idempotencyKey } }),

  verifyIntegrity: () =>
    api.get<IntegrityResult>('/ledger/verify-integrity'),
}
