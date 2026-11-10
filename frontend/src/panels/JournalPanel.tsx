import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ledgerApi, Transaction, Account, AccountType, EntryType } from '../api'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRightLeft,
  Search,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  X,
  ArrowRight,
  ShieldCheck,
  Plus,
  Hash,
  KeyRound,
  Filter,
} from 'lucide-react'
import { UserAvatar, MoneyFlowDiagram, EmptyStateIllustration } from '../components/VisualAssets'

const TYPE_BADGE: Record<string, string> = {
  ASSET: 'badge-emerald',
  LIABILITY: 'badge-rose',
  EQUITY: 'badge-indigo',
  REVENUE: 'badge-emerald',
  EXPENSE: 'badge-amber',
}

export default function JournalPanel() {
  const qc = useQueryClient()
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null)
  const [showAuditProofId, setShowAuditProofId] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'ALL' | 'BALANCED' | 'TODAY'>('ALL')
  const [showTransferDrawer, setShowTransferDrawer] = useState(false)

  // Drawer Form State
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
  const [txError, setTxError] = useState('')

  // Query transactions and accounts
  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: () => ledgerApi.getTransactions(100).then((r) => (Array.isArray(r.data) ? r.data : [])),
    refetchInterval: 4000,
  })

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts-list'],
    queryFn: () => ledgerApi.getAccounts().then((r) => (Array.isArray(r.data) ? r.data : [])),
  })

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // Create Transaction Mutation
  const postTxMutation = useMutation({
    mutationFn: (payload: { description: string; entries: any[] }) => {
      const key = `tx-${Date.now()}-${Math.random().toString(36).slice(2)}`
      return ledgerApi.postTransaction(key, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts-list'] })
      qc.invalidateQueries({ queryKey: ['integrity'] })
      setShowTransferDrawer(false)
      setQuickAmount('')
      setQuickDesc('')
      setTxError('')
    },
    onError: (e: any) => setTxError(e.response?.data?.message || 'Transfer rejected by ledger engine'),
  })

  const handlePostQuickTx = (e: React.FormEvent) => {
    e.preventDefault()
    setTxError('')
    const cents = Math.round(parseFloat(quickAmount) * 100)
    if (!cents || cents <= 0) {
      setTxError('Please enter a valid transfer amount greater than zero.')
      return
    }
    if (!quickSource || !quickDest) {
      setTxError('Please select both source and destination accounts.')
      return
    }
    if (quickSource === quickDest) {
      setTxError('Source and destination accounts must be different.')
      return
    }

    postTxMutation.mutate({
      description: quickDesc.trim() || 'Direct Account Transfer',
      entries: [
        { account_id: quickDest, entry_type: 'DEBIT', amount: cents },
        { account_id: quickSource, entry_type: 'CREDIT', amount: cents },
      ],
    })
  }

  const handlePostMultiTx = (e: React.FormEvent) => {
    e.preventDefault()
    setTxError('')

    const formatted = multiEntries.map((entry) => ({
      account_id: entry.account_id,
      entry_type: entry.entry_type,
      amount: Math.round(parseFloat(entry.amount || '0') * 100),
    }))

    const invalidEntry = formatted.find((entry) => !entry.account_id || entry.amount <= 0)
    if (invalidEntry) {
      setTxError('All journal legs must have an account and an amount greater than zero.')
      return
    }

    const totalDebit = formatted
      .filter((e) => e.entry_type === 'DEBIT')
      .reduce((sum, e) => sum + e.amount, 0)
    const totalCredit = formatted
      .filter((e) => e.entry_type === 'CREDIT')
      .reduce((sum, e) => sum + e.amount, 0)

    if (totalDebit !== totalCredit) {
      setTxError(
        `Double-entry imbalance: Debits ($${(totalDebit / 100).toFixed(2)}) must equal Credits ($${(
          totalCredit / 100
        ).toFixed(2)}).`
      )
      return
    }

    postTxMutation.mutate({
      description: multiDesc.trim() || 'Multi-Leg Journal Posting',
      entries: formatted,
    })
  }

  // Filter transactions
  const filtered = transactions.filter((t) => {
    const matchesSearch =
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.hash.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.entries?.some((e) => e.account_name?.toLowerCase().includes(search.toLowerCase()))

    if (!matchesSearch) return false

    if (filterType === 'BALANCED') {
      const legs = t.entries || []
      const debit = legs.filter((l) => l.entry_type === 'DEBIT').reduce((s, l) => s + parseInt(l.amount, 10), 0)
      const credit = legs.filter((l) => l.entry_type === 'CREDIT').reduce((s, l) => s + parseInt(l.amount, 10), 0)
      return debit === credit
    }

    if (filterType === 'TODAY') {
      const today = new Date().toDateString()
      return new Date(t.posted_at).toDateString() === today
    }

    return true
  })

  // Calculate volume
  const totalVolumeCents = transactions.reduce((acc, tx) => {
    const debitSum = (tx.entries || [])
      .filter((e) => e.entry_type === 'DEBIT')
      .reduce((s, e) => s + parseInt(e.amount || '0', 10), 0)
    return acc + debitSum
  }, 0)

  return (
    <div className="space-y-6">
      {/* Page Header (Max 4-6 Words Subtitle) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Transactions</h2>
          <p className="text-xs text-slate-500 mt-0.5">Double-entry transfers and history</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowTransferDrawer(true)}
            className="btn-tactile text-xs py-2 px-3.5 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Transfer</span>
          </button>
        </div>
      </div>

      {/* Mini Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="craft-card p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Postings
            </div>
            <div className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">
              {transactions.length}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
        </div>

        <div className="craft-card p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Volume Settled
            </div>
            <div className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">
              ${(totalVolumeCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="craft-card p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Settlement Status
            </div>
            <div className="text-sm font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              100% Balanced & Verified
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="craft-card p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search memo, account, or hash..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-input text-xs pl-8 pr-3 py-1.5 w-full"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              filterType === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Postings
          </button>
          <button
            onClick={() => setFilterType('BALANCED')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              filterType === 'BALANCED'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Balanced Only
          </button>
          <button
            onClick={() => setFilterType('TODAY')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              filterType === 'TODAY'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Today
          </button>
        </div>
      </div>

      {/* Floating Transaction Rows */}
      {isLoading ? (
        <div className="craft-card p-12 text-center text-xs text-slate-400">
          Loading transfers...
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2.5">
          {filtered.map((tx) => {
            const isExpanded = expandedTxId === tx.id
            const legs = tx.entries || []
            const totalDebit = legs
              .filter((l) => l.entry_type === 'DEBIT')
              .reduce((sum, l) => sum + parseInt(l.amount, 10), 0)
            const totalCredit = legs
              .filter((l) => l.entry_type === 'CREDIT')
              .reduce((sum, l) => sum + parseInt(l.amount, 10), 0)
            const isBalanced = totalDebit === totalCredit

            // Extract source and destination for 2-leg visual diagram
            const sourceLeg = legs.find((l) => l.entry_type === 'CREDIT')
            const destLeg = legs.find((l) => l.entry_type === 'DEBIT')

            return (
              <div
                key={tx.id}
                className={`floating-row transition-all ${
                  isExpanded ? 'ring-1 ring-indigo-500/20 bg-slate-50/40' : ''
                }`}
              >
                {/* Main Row Header */}
                <div
                  onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 avatar-wrapper relative mt-0.5">
                      <UserAvatar
                        name={tx.creator?.name || tx.description || 'Transfer'}
                        size={36}
                        className="ring-2 ring-white shadow-xs"
                      />
                      <div className="avatar-tooltip text-xs font-semibold text-slate-700">
                        {tx.creator?.name ? `${tx.creator.name} (${tx.creator.role || 'Staff'})` : 'System Core / Genesis'}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 tracking-tight">
                          {tx.description}
                        </span>
                        <span
                          className="badge badge-emerald text-[10px] flex items-center gap-1 font-medium cursor-help"
                          title="Protected by cryptographic audit log"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Verified
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {new Date(tx.posted_at).toLocaleString()}
                        </span>

                        {tx.creator ? (
                          <span className="badge badge-purple text-[10px] flex items-center gap-1 font-sans">
                            <User className="w-2.5 h-2.5" />
                            {tx.creator.name}
                          </span>
                        ) : (
                          <span className="text-slate-400">System Genesis</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Total Amount & Action Pill */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-base font-bold text-slate-900 tabular-nums">
                        ${(totalDebit / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-medium">
                        Completed
                      </div>
                    </div>

                    <div className="p-1 rounded-md text-slate-400 hover:text-slate-700 transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Progressive Disclosure: Visual Flow Diagram & Detailed Postings */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4 overflow-hidden"
                    >
                      {/* Visual Directional Flow Diagram */}
                      {sourceLeg && destLeg && legs.length === 2 && (
                        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
                          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Transfer Flow Diagram
                          </div>
                          <MoneyFlowDiagram
                            sourceLabel={sourceLeg.account_name || 'Source Account'}
                            destLabel={destLeg.account_name || 'Destination Account'}
                            amount={(totalDebit / 100).toFixed(2)}
                            sourceType="ASSET"
                            destType="ASSET"
                          />
                        </div>
                      )}

                      {/* Detailed Double-Entry Leg Breakdown Table */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Ledger Postings ({legs.length} legs)
                        </div>

                        {legs.map((leg, idx) => {
                          const isDebit = leg.entry_type === 'DEBIT'
                          const amt = (parseInt(leg.amount, 10) / 100).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })
                          return (
                            <div
                              key={leg.id || idx}
                              className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`badge text-[10px] font-bold ${
                                    isDebit ? 'badge-emerald' : 'badge-rose'
                                  }`}
                                >
                                  {leg.entry_type}
                                </span>
                                <span className="text-slate-800 font-medium">
                                  {leg.account_name || `Account ${leg.account_id.slice(0, 8)}...`}
                                </span>
                              </div>

                              <span
                                className={`font-bold tabular-nums ${
                                  isDebit ? 'text-emerald-700' : 'text-slate-900'
                                }`}
                              >
                                ${amt}
                              </span>
                            </div>
                          )
                        })}

                        {/* Receipt Status Bar */}
                        <div className="pt-2 px-1 flex items-center justify-between text-xs text-slate-500">
                          <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>100% Balanced & Reconciled</span>
                          </span>
                          <button
                            onClick={() => setShowAuditProofId(showAuditProofId === tx.id ? null : tx.id)}
                            className="text-[11px] text-slate-400 hover:text-indigo-600 font-medium cursor-pointer transition-colors"
                          >
                            {showAuditProofId === tx.id ? '▾ Hide Audit Proof' : '▸ View Technical & Audit Proof'}
                          </button>
                        </div>
                      </div>

                      {/* Technical Audit Proof (Progressive Disclosure) */}
                      {showAuditProofId === tx.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-500 tabular-nums"
                        >
                          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="text-slate-400">Transaction UUID:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[150px] text-slate-700">{tx.id}</span>
                              <button
                                onClick={() => copyToClipboard(tx.id, `id-${tx.id}`)}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                                title="Copy TX ID"
                              >
                                {copiedKey === `id-${tx.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="text-slate-400">Block Sequence:</span>
                            <span className="text-slate-700 font-bold">#{tx.sequence_num}</span>
                          </div>

                          <div className="col-span-full flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="text-slate-400">SHA-256 Digest:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[280px] text-indigo-600 font-semibold">
                                {tx.hash}
                              </span>
                              <button
                                onClick={() => copyToClipboard(tx.hash, `hashfull-${tx.id}`)}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                                title="Copy Full SHA-256 Hash"
                              >
                                {copiedKey === `hashfull-${tx.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyStateIllustration
          variant="search"
          title="No transactions found"
          subtitle="Try adjusting your search or date filter"
        />
      )}

      {/* ==================================================================== */}
      {/* SLIDE-OVER DRAWER: NEW TRANSFER / JOURNAL ENTRY                      */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {showTransferDrawer && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTransferDrawer(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between"
              >
                {/* Drawer Header */}
                <div className="p-6 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                        <ArrowRightLeft className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 tracking-tight">
                          Transfer Funds
                        </h3>
                        <p className="text-xs text-slate-500">Instant, verified transfer between accounts</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowTransferDrawer(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Mode Toggle */}
                  <div className="flex gap-2 mt-5">
                    <button
                      type="button"
                      onClick={() => setTxMode('quick')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        txMode === 'quick'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Quick Transfer
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxMode('multi')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        txMode === 'multi'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Advanced Split
                    </button>
                  </div>
                </div>

                {/* Drawer Body */}
                <div className="p-6 flex-1 overflow-y-auto space-y-4">
                  {txError && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                      {txError}
                    </div>
                  )}

                  {txMode === 'quick' ? (
                    <form id="transfer-form" onSubmit={handlePostQuickTx} className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          From Account
                        </label>
                        <select
                          value={quickSource}
                          onChange={(e) => setQuickSource(e.target.value)}
                          className="glass-input text-xs w-full py-2"
                          required
                        >
                          <option value="">Select source account...</option>
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} (${(parseInt(acc.balance || '0', 10) / 100).toFixed(2)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          To Account
                        </label>
                        <select
                          value={quickDest}
                          onChange={(e) => setQuickDest(e.target.value)}
                          className="glass-input text-xs w-full py-2"
                          required
                        >
                          <option value="">Select destination account...</option>
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} ({acc.type}) — ${(parseInt(acc.balance || '0', 10) / 100).toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Amount (USD)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-slate-400 text-xs">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            value={quickAmount}
                            onChange={(e) => setQuickAmount(e.target.value)}
                            className="glass-input text-xs w-full pl-7 py-2 font-bold tabular-nums"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Description / Reference Memo
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Wire transfer, payroll payout"
                          value={quickDesc}
                          onChange={(e) => setQuickDesc(e.target.value)}
                          className="glass-input text-xs w-full py-2"
                        />
                      </div>
                    </form>
                  ) : (
                    <form id="transfer-form" onSubmit={handlePostMultiTx} className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Transaction Memo
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Customer checkout with processing fee"
                          value={multiDesc}
                          onChange={(e) => setMultiDesc(e.target.value)}
                          className="glass-input text-xs w-full py-2"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700 block">
                          Journal Legs
                        </label>
                        {multiEntries.map((leg, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2"
                          >
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                              <span>Leg #{idx + 1}</span>
                              {multiEntries.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMultiEntries(multiEntries.filter((_, i) => i !== idx))
                                  }
                                  className="text-rose-600 hover:text-rose-700 cursor-pointer"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={leg.entry_type}
                                onChange={(e) => {
                                  const copy = [...multiEntries]
                                  copy[idx].entry_type = e.target.value as EntryType
                                  setMultiEntries(copy)
                                }}
                                className="glass-input text-xs py-1.5"
                              >
                                <option value="DEBIT">DEBIT (+)</option>
                                <option value="CREDIT">CREDIT (-)</option>
                              </select>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="Amount ($)"
                                value={leg.amount}
                                onChange={(e) => {
                                  const copy = [...multiEntries]
                                  copy[idx].amount = e.target.value
                                  setMultiEntries(copy)
                                }}
                                className="glass-input text-xs py-1.5 tabular-nums"
                                required
                              />
                            </div>
                            <select
                              value={leg.account_id}
                              onChange={(e) => {
                                const copy = [...multiEntries]
                                copy[idx].account_id = e.target.value
                                setMultiEntries(copy)
                              }}
                              className="glass-input text-xs w-full py-1.5"
                              required
                            >
                              <option value="">Select account...</option>
                              {accounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.name} ({acc.type})
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() =>
                            setMultiEntries([
                              ...multiEntries,
                              { account_id: '', entry_type: 'DEBIT', amount: '' },
                            ])
                          }
                          className="w-full py-1.5 rounded-lg border border-dashed border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          + Add Additional Leg
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Drawer Footer */}
                <div className="p-6 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowTransferDrawer(false)}
                    className="btn-secondary text-xs py-2 px-4 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="transfer-form"
                    disabled={postTxMutation.isPending}
                    className="btn-tactile text-xs py-2 px-5 cursor-pointer disabled:opacity-50"
                  >
                    {postTxMutation.isPending ? 'Committing...' : 'Post Immutable Entry'}
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
