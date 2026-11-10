import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ledgerApi, Account, AccountType, EntryType, TransactionResult } from '../api'
import { motion, AnimatePresence } from 'framer-motion'
import AccountStatementModal from '../components/AccountStatementModal'
import {
  Landmark,
  Plus,
  ArrowRightLeft,
  ChevronRight,
  Zap,
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  Check,
} from 'lucide-react'
import { AccountEmblem, CurrencyBadge, MiniSparkline, EmptyStateIllustration } from '../components/VisualAssets'

const TYPE_BADGE: Record<string, string> = {
  ASSET: 'badge-emerald',
  LIABILITY: 'badge-rose',
  EQUITY: 'badge-indigo',
  REVENUE: 'badge-emerald',
  EXPENSE: 'badge-amber',
}

const TYPE_SPARKLINE_COLOR: Record<string, string> = {
  ASSET: '#10B981',
  LIABILITY: '#F43F5E',
  EQUITY: '#6366F1',
  REVENUE: '#0EA5E9',
  EXPENSE: '#F59E0B',
}

function getSparklineValues(account: Account): number[] {
  const seed = account.id.replace(/-/g, '')
  const base = Math.max(Math.abs(parseInt(account.balance || '0', 10)) / 100, 10)
  return Array.from({ length: 8 }, (_, i) => {
    const charVal = parseInt(seed[i * 2] || '5', 16)
    return Math.max(base * 0.4 + (charVal / 15) * base * 0.9, 1)
  })
}

interface AccountsPanelProps {
  initialOpenAccountModal?: boolean
  initialOpenTxModal?: boolean
  onResetInitialModals?: () => void
}

export default function AccountsPanel({
  initialOpenAccountModal = false,
  initialOpenTxModal = false,
  onResetInitialModals,
}: AccountsPanelProps) {
  const qc = useQueryClient()
  const [showCreateDrawer, setShowCreateDrawer] = useState(initialOpenAccountModal)
  const [showTxDrawer, setShowTxDrawer] = useState(initialOpenTxModal)
  const [selectedStatementAccount, setSelectedStatementAccount] = useState<Account | null>(null)
  const [searchFilter, setSearchFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts-list'],
    queryFn: () => ledgerApi.getAccounts().then((r) => r.data),
    refetchInterval: 4000,
  })

  // Create Account Drawer Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    type: 'ASSET' as AccountType,
    currency: 'USD',
    allow_overdraft: false,
  })
  const [createError, setCreateError] = useState('')

  const createAccountMutation = useMutation({
    mutationFn: () => ledgerApi.createAccount(createForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts-list'] })
      setShowCreateDrawer(false)
      setCreateForm({ name: '', type: 'ASSET', currency: 'USD', allow_overdraft: false })
      setCreateError('')
    },
    onError: (e: any) => setCreateError(e.response?.data?.message || 'Failed to create account'),
  })

  // Post Transaction Drawer State
  const [txMode, setTxMode] = useState<'quick' | 'multi'>('quick')
  const [quickSource, setQuickSource] = useState('')
  const [quickDest, setQuickDest] = useState('')
  const [quickAmount, setQuickAmount] = useState('')
  const [quickDesc, setQuickDesc] = useState('')
  const [multiDesc, setMultiDesc] = useState('')
  const [multiEntries, setMultiEntries] = useState([
    { account_id: '', entry_type: 'DEBIT' as EntryType, amount: '' },
    { account_id: '', entry_type: 'CREDIT' as EntryType, amount: '' },
  ])
  const [simulateReplay, setSimulateReplay] = useState(false)
  const [fixedKey, setFixedKey] = useState('')
  const [txError, setTxError] = useState('')
  const [lastTxResult, setLastTxResult] = useState<TransactionResult | null>(null)
  const [copiedHash, setCopiedHash] = useState(false)

  const postTxMutation = useMutation({
    mutationFn: async () => {
      let key = simulateReplay && fixedKey ? fixedKey : `tx-${Date.now()}-${Math.random().toString(36).slice(2)}`
      if (!fixedKey) setFixedKey(key)

      let payload
      if (txMode === 'quick') {
        const cents = Math.round(parseFloat(quickAmount) * 100)
        payload = {
          description: quickDesc || `Transfer from ${quickSource.slice(0, 8)} to ${quickDest.slice(0, 8)}`,
          entries: [
            { account_id: quickDest, entry_type: 'DEBIT' as EntryType, amount: cents },
            { account_id: quickSource, entry_type: 'CREDIT' as EntryType, amount: cents },
          ],
        }
      } else {
        payload = {
          description: multiDesc,
          entries: multiEntries.map((e) => ({
            account_id: e.account_id,
            entry_type: e.entry_type,
            amount: Math.round(parseFloat(e.amount) * 100),
          })),
        }
      }

      return ledgerApi.postTransaction(key, payload)
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['accounts-list'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['integrity'] })
      setLastTxResult(res.data)
      setTxError('')
    },
    onError: (e: any) => setTxError(e.response?.data?.message || 'Transaction failed'),
  })

  const filteredAccounts = accounts.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      a.id.toLowerCase().includes(searchFilter.toLowerCase())
    const matchesType = typeFilter === 'ALL' || a.type === typeFilter
    return matchesSearch && matchesType
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedHash(true)
    setTimeout(() => setCopiedHash(false), 2000)
  }

  return (
    <div className="space-y-8">
      {/* Top Action Bar (Clean Microcopy & Trigger Buttons) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Accounts</h1>
          <p className="text-xs text-slate-500 mt-1">Manage balances and statements</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowCreateDrawer(true)
              onResetInitialModals?.()
            }}
            className="btn-secondary text-xs py-2 px-3.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>New Account</span>
          </button>

          <button
            onClick={() => {
              setShowTxDrawer(true)
              onResetInitialModals?.()
            }}
            className="btn-tactile text-xs py-2 px-4 cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer Funds</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Filter accounts by name..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="saas-input text-xs max-w-xs py-2"
        />

        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200/80 text-xs shadow-2xs">
          {['ALL', 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                typeFilter === t
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Accounts Grid (Clean Spring Lift & Border Glow) */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400 craft-card">
          Loading accounts...
        </div>
      ) : filteredAccounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAccounts.map((account) => {
            const rawBalance = parseInt(account.balance || '0', 10)
            const formatted = (rawBalance / 100).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })

            return (
              <div
                key={account.id}
                onClick={() => setSelectedStatementAccount(account)}
                className="craft-card craft-card-hover account-card-sheen spotlight-card p-6 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <AccountEmblem type={account.type} size={40} />
                    <div className="text-right">
                      <span className={`badge ${TYPE_BADGE[account.type] || 'badge-cyan'} block mb-1`}>
                        {account.type}
                      </span>
                      <CurrencyBadge currency={account.currency} />
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors mt-2">
                    {account.name}
                  </h3>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4">
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Balance
                      </span>
                      <span className="text-2xl font-extrabold text-slate-900 tabular-nums tracking-tight mt-0.5 block">
                        ${formatted}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-indigo-600 font-semibold group-hover:translate-x-1 transition-transform">
                      <span>Statement</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                  <MiniSparkline
                    values={getSparklineValues(account)}
                    color={TYPE_SPARKLINE_COLOR[account.type] || '#6366F1'}
                    width={180}
                    height={32}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyStateIllustration variant="vault" title="No accounts match filter" subtitle="Try adjusting the type filter or search above" />
      )}

      {/* ==================================================================== */}
      {/* SLIDE-OVER DRAWER: CREATE NEW ACCOUNT (BLURRED BACKDROP) */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {showCreateDrawer && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/30 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, x: 400 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 400 }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="w-full max-w-md h-full bg-white border-l border-slate-200 shadow-2xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-900 text-base">New Account</h3>
                  </div>
                  <button
                    onClick={() => setShowCreateDrawer(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {createError && (
                  <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    {createError}
                  </div>
                )}

                <div className="space-y-4 mt-6">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Account Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Treasury Operations Vault"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      className="saas-input text-sm"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Classification</label>
                    <select
                      value={createForm.type}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, type: e.target.value as AccountType })
                      }
                      className="saas-input text-sm"
                    >
                      <option value="ASSET">ASSET (Normal DEBIT balance)</option>
                      <option value="LIABILITY">LIABILITY (Normal CREDIT balance)</option>
                      <option value="EQUITY">EQUITY (Normal CREDIT balance)</option>
                      <option value="REVENUE">REVENUE (Normal CREDIT balance)</option>
                      <option value="EXPENSE">EXPENSE (Normal DEBIT balance)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Currency</label>
                    <select
                      value={createForm.currency}
                      onChange={(e) => setCreateForm({ ...createForm, currency: e.target.value })}
                      className="saas-input text-sm"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="overdraft-toggle"
                      checked={createForm.allow_overdraft}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, allow_overdraft: e.target.checked })
                      }
                      className="w-4 h-4 accent-indigo-600 cursor-pointer"
                    />
                    <label htmlFor="overdraft-toggle" className="text-xs text-slate-700 cursor-pointer font-medium">
                      Allow Negative Overdraft Balance
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateDrawer(false)}
                  className="flex-1 btn-secondary text-xs py-2.5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => createAccountMutation.mutate()}
                  disabled={createAccountMutation.isPending || !createForm.name.trim()}
                  className="flex-1 btn-tactile text-xs py-2.5 cursor-pointer disabled:opacity-40"
                >
                  {createAccountMutation.isPending ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================================== */}
      {/* SLIDE-OVER DRAWER: POST DOUBLE-ENTRY TRANSFER */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {showTxDrawer && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/30 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, x: 500 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 500 }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="w-full max-w-lg h-full bg-white border-l border-slate-200 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-900 text-base">Transfer Funds</h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowTxDrawer(false)
                      setLastTxResult(null)
                      setTxError('')
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Subheader & Mode Switcher */}
                <div className="flex items-center justify-between mt-4 mb-4">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                    <button
                      onClick={() => setTxMode('quick')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        txMode === 'quick' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      Quick Transfer
                    </button>
                    <button
                      onClick={() => setTxMode('multi')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        txMode === 'multi' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      Multi-Leg Journal (≥2)
                    </button>
                  </div>

                  <span className="badge badge-indigo text-[10px]">Balanced</span>
                </div>

                {txError && (
                  <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>{txError}</span>
                  </div>
                )}

                {/* Success Banner */}
                {lastTxResult && (
                  <div
                    className={`mb-4 p-4 rounded-xl border text-xs space-y-1.5 ${
                      lastTxResult.is_idempotent_replay
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {lastTxResult.is_idempotent_replay
                          ? 'Transfer Already Completed (Duplicate Guarded)'
                          : 'Transfer Posted Successfully'}
                      </span>
                      <span className="badge badge-emerald text-[10px]">✓ Settled</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal">
                      Funds moved and verified in ledger records.
                    </p>
                  </div>
                )}

                {/* Quick Transfer Mode */}
                {txMode === 'quick' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1.5 block">From Account</label>
                      <select
                        value={quickSource}
                        onChange={(e) => setQuickSource(e.target.value)}
                        className="saas-input text-xs"
                      >
                        <option value="">Select source account...</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} (${((parseInt(a.balance || '0', 10)) / 100).toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1.5 block">To Account</label>
                      <select
                        value={quickDest}
                        onChange={(e) => setQuickDest(e.target.value)}
                        className="saas-input text-xs"
                      >
                        <option value="">Select destination account...</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} (${((parseInt(a.balance || '0', 10)) / 100).toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Amount ($ USD)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={quickAmount}
                        onChange={(e) => setQuickAmount(e.target.value)}
                        className="saas-input text-sm tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Description</label>
                      <input
                        type="text"
                        placeholder="e.g. Operating sweep transfer"
                        value={quickDesc}
                        onChange={(e) => setQuickDesc(e.target.value)}
                        className="saas-input text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  /* Multi-Leg Journal Mode */
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Description</label>
                      <input
                        type="text"
                        placeholder="e.g. Multi-account settlement"
                        value={multiDesc}
                        onChange={(e) => setMultiDesc(e.target.value)}
                        className="saas-input text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Journal Legs</span>
                        <button
                          type="button"
                          onClick={() =>
                            setMultiEntries([
                              ...multiEntries,
                              { account_id: '', entry_type: 'CREDIT', amount: '' },
                            ])
                          }
                          className="text-indigo-600 hover:underline font-semibold cursor-pointer"
                        >
                          + Add Leg
                        </button>
                      </div>

                      {multiEntries.map((leg, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <select
                            value={leg.account_id}
                            onChange={(e) => {
                              const updated = [...multiEntries]
                              updated[idx].account_id = e.target.value
                              setMultiEntries(updated)
                            }}
                            className="saas-input text-xs flex-1"
                          >
                            <option value="">Select account...</option>
                            {accounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </select>

                          <select
                            value={leg.entry_type}
                            onChange={(e) => {
                              const updated = [...multiEntries]
                              updated[idx].entry_type = e.target.value as EntryType
                              setMultiEntries(updated)
                            }}
                            className="saas-input text-xs w-24"
                          >
                            <option value="DEBIT">DEBIT</option>
                            <option value="CREDIT">CREDIT</option>
                          </select>

                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={leg.amount}
                            onChange={(e) => {
                              const updated = [...multiEntries]
                              updated[idx].amount = e.target.value
                              setMultiEntries(updated)
                            }}
                            className="saas-input text-xs w-28 tabular-nums"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowTxDrawer(false)}
                  className="flex-1 btn-secondary text-xs py-2.5 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => postTxMutation.mutate()}
                  disabled={postTxMutation.isPending}
                  className="flex-1 btn-tactile text-xs py-2.5 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{postTxMutation.isPending ? 'Committing...' : 'Commit Transfer'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Account Statement Slide-Over */}
      <AccountStatementModal
        account={selectedStatementAccount}
        onClose={() => setSelectedStatementAccount(null)}
      />
    </div>
  )
}
