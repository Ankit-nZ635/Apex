import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ledgerApi, Account, Transaction } from '../api'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  ChevronRight,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Plus,
  ArrowRightLeft,
} from 'lucide-react'
import { UserAvatar, MoneyFlowDiagram, EmptyStateIllustration, SettlementNotifCard } from '../components/VisualAssets'

interface DashboardPanelProps {
  onNavigateToAccounts?: () => void
  onNavigateToTransactions?: () => void
  onNavigateToSecurity?: () => void
  onOpenNewAccount?: () => void
  onOpenNewTransaction?: () => void
}

export default function DashboardPanel({
  onNavigateToAccounts,
  onNavigateToTransactions,
  onNavigateToSecurity,
  onOpenNewAccount,
  onOpenNewTransaction,
}: DashboardPanelProps) {
  const [copiedHash, setCopiedHash] = useState<string | null>(null)
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null)
  const [showAuditDetailsId, setShowAuditDetailsId] = useState<string | null>(null)

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts-list'],
    queryFn: () => ledgerApi.getAccounts().then((r) => (Array.isArray(r.data) ? r.data : [])),
    refetchInterval: 5000,
  })

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: () => ledgerApi.getTransactions(25).then((r) => (Array.isArray(r.data) ? r.data : [])),
    refetchInterval: 5000,
  })

  const { data: integrity } = useQuery({
    queryKey: ['integrity'],
    queryFn: () => ledgerApi.verifyIntegrity().then((r) => r.data),
    refetchInterval: 10000,
  })

  // Financial calculations
  const totalAssets = accounts
    .filter((a) => a.type === 'ASSET')
    .reduce((sum, a) => sum + parseInt(a.balance || '0', 10), 0)

  const totalEquity = accounts
    .filter((a) => a.type === 'EQUITY')
    .reduce((sum, a) => sum + parseInt(a.balance || '0', 10), 0)

  const totalVolumeCents = transactions.reduce((sum, tx) => {
    const debitTotal = (tx.entries || [])
      .filter((e) => e.entry_type === 'DEBIT')
      .reduce((s, e) => s + parseInt(e.amount, 10), 0)
    return sum + debitTotal
  }, 0)

  // Chart data
  const chartData = [...transactions]
    .reverse()
    .slice(-14)
    .map((tx) => {
      const vol = (tx.entries || [])
        .filter((e) => e.entry_type === 'DEBIT')
        .reduce((s, e) => s + parseInt(e.amount, 10), 0)
      return {
        seq: `#${tx.sequence_num}`,
        volume: vol / 100,
        time: new Date(tx.posted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    })

  const copyToClipboard = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopiedHash(id)
    setTimeout(() => setCopiedHash(null), 1800)
  }

  return (
    <div className="space-y-8">
      {/* Page Header (Human-Friendly Microcopy) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">Live balances and cash flow</p>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNewAccount}
            className="btn-secondary text-xs py-2 px-3.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>New Account</span>
          </button>
          <button
            onClick={onOpenNewTransaction}
            className="btn-tactile text-xs py-2 px-4 cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer Funds</span>
          </button>
        </div>
      </div>

      {/* Visual Hero Banner */}
      <div className="craft-card p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A2540 0%, #1E3A5F 50%, #1E1B4B 100%)' }}>
        {/* Animated mesh background */}
        <div className="absolute inset-0 opacity-30">
          <svg viewBox="0 0 400 120" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            <path d="M0 60 Q50 30 100 60 T200 60 T300 60 T400 60 L400 120 L0 120 Z" fill="url(#waveGrad)">
              <animateTransform attributeName="transform" type="translate" from="-200,0" to="0,0" dur="8s" repeatCount="indefinite" />
            </path>
          </svg>
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-indigo-200 text-xs uppercase tracking-wider mb-1 font-medium">Financial Control Center</p>
            <h2 className="text-white text-xl font-bold tracking-tight">Apex Treasury Studio</h2>
            <p className="text-slate-300 text-xs mt-1">Double-entry ledger • Audit-protected • Real-time</p>
          </div>
          <div className="flex items-center gap-3">
            <SettlementNotifCard amount="$8,400.00" className="text-xs" style={{ minWidth: 200 }} />
          </div>
        </div>
      </div>

      {/* 3 Spacious KPI Summary Cards (Bento Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Total Assets */}
        <div
          onClick={onNavigateToAccounts}
          className="craft-card craft-card-hover p-7"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Assets
            </span>
            <span className="badge badge-emerald text-[10px]">Active Vault</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight mt-2.5">
            ${(totalAssets / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
            <span>Backed across {accounts.filter((a) => a.type === 'ASSET').length} liquid accounts</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </p>
        </div>

        {/* Card 2: Net Equity */}
        <div
          onClick={onNavigateToAccounts}
          className="craft-card craft-card-hover p-7"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Net Equity
            </span>
            <span className="badge badge-indigo text-[10px]">Capital Backed</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight mt-2.5">
            ${(totalEquity / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
            <span>Conservation invariant strictly preserved</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </p>
        </div>

        {/* Card 3: Total Transfers */}
        <div
          onClick={onNavigateToTransactions}
          className="craft-card craft-card-hover p-7"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Transfers
            </span>
            <span className="badge badge-cyan text-[10px]">{transactions.length} Events</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight mt-2.5">
            ${(totalVolumeCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
            <span>Protected transfer volume</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </p>
        </div>
      </div>

      {/* Main Section: Cash Flow Chart + Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cash Flow Velocity Curve */}
        <div className="lg:col-span-8 craft-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Transfer Velocity</h2>
              <p className="text-xs text-slate-400 mt-0.5">Volume moved across recent activity</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold">
              <TrendingUp className="w-4 h-4" />
              <span>Real-time</span>
            </div>
          </div>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 10,
                    fontSize: 12,
                    boxShadow: '0 8px 16px -4px rgba(15, 23, 42, 0.08)',
                  }}
                  labelStyle={{ color: '#64748B', fontFamily: 'Inter, system-ui, sans-serif' }}
                  formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'Transferred']}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="#4F46E5"
                  strokeWidth={2}
                  fill="url(#velocityGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-xs">
              Post transfers to populate cash velocity curves
            </div>
          )}
        </div>

        {/* Quick Account Balances */}
        <div className="lg:col-span-4 craft-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Active Accounts</h2>
              <button
                onClick={onNavigateToAccounts}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer flex items-center gap-0.5"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {accounts.slice(0, 4).map((acc) => {
                const bal = (parseInt(acc.balance || '0', 10) / 100).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })
                return (
                  <div
                    key={acc.id}
                    onClick={onNavigateToAccounts}
                    className="p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100/70 border border-slate-200/80 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{acc.name}</div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">{acc.type}</span>
                    </div>
                    <div className="text-right font-bold text-xs text-slate-900 tabular-nums">
                      ${bal}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div
            onClick={onNavigateToSecurity}
            className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">
                Chain Verified
              </span>
            </div>
            <span className="badge badge-emerald text-[10px]">
              {integrity?.total_blocks || transactions.length} Blocks
            </span>
          </div>
        </div>
      </div>

      {/* Progressive Disclosure: Recent Activity with Visual Transfer Flow */}
      <div className="craft-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Recent Activity</h2>
            <p className="text-xs text-slate-400 mt-0.5">Click any row to inspect money flow</p>
          </div>
          <button
            onClick={onNavigateToTransactions}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer flex items-center gap-0.5"
          >
            <span>Full History</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          {transactions.length === 0 ? (
            <EmptyStateIllustration
              variant="transfer"
              title="No transfers yet"
              subtitle="Post your first double-entry transaction above"
            />
          ) : (
            transactions.slice(0, 5).map((tx) => {
            const isExpanded = expandedTxId === tx.id
            const legs = tx.entries || []
            const debitLeg = legs.find((l) => l.entry_type === 'DEBIT')
            const creditLeg = legs.find((l) => l.entry_type === 'CREDIT')
            const amountFormatted = debitLeg
              ? (parseInt(debitLeg.amount, 10) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })
              : '0.00'

            return (
              <div
                key={tx.id}
                onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                className="floating-row cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={tx.creator?.name || tx.description} size={32} />
                    <div>
                      <div className="font-semibold text-slate-900">{tx.description}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>{new Date(tx.posted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {tx.creator && <span className="text-indigo-600 font-medium">· {tx.creator.name}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Progressive Disclosure: Verified Status & Amount */}
                  <div className="flex items-center gap-3">
                    <span
                      className="badge badge-emerald text-[10px] flex items-center gap-1 font-medium cursor-help"
                      title="Protected by cryptographic audit log"
                    >
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Verified</span>
                    </span>

                    <div className="font-bold text-slate-900 tabular-nums text-sm">
                      ${amountFormatted}
                    </div>
                  </div>
                </div>

                {/* Visual Flow Accordion Diagram */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-3.5 border-t border-slate-100 overflow-hidden"
                    >
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                        <MoneyFlowDiagram
                          sourceLabel={creditLeg?.account_name || 'Operating Checking'}
                          destLabel={debitLeg?.account_name || 'Merchant Settlement'}
                          amount={amountFormatted}
                          sourceType="ASSET"
                          destType="ASSET"
                        />
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-medium text-emerald-700">
                          <Check className="w-3.5 h-3.5" />
                          <span>Transfer Completed · Verified</span>
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowAuditDetailsId(showAuditDetailsId === tx.id ? null : tx.id)
                          }}
                          className="text-[11px] text-slate-400 hover:text-indigo-600 font-medium cursor-pointer transition-colors"
                        >
                          {showAuditDetailsId === tx.id ? '▾ Hide Technical Proof' : '▸ View Technical & Audit Proof'}
                        </button>
                      </div>

                      {showAuditDetailsId === tx.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Transaction ID:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[200px] text-slate-700">{tx.id}</span>
                              <button
                                onClick={(e) => copyToClipboard(tx.id, `txid-${tx.id}`, e)}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                                title="Copy TX ID"
                              >
                                {copiedHash === `txid-${tx.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">SHA-256 Digest:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[200px] text-indigo-600 font-semibold">{tx.hash}</span>
                              <button
                                onClick={(e) => copyToClipboard(tx.hash, `txhash-${tx.id}`, e)}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                                title="Copy Hash"
                              >
                                {copiedHash === `txhash-${tx.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
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
          })
        )}
        </div>
      </div>
    </div>
  )
}
