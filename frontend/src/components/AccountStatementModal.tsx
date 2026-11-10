import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ledgerApi, Account } from '../api'
import { X, Download, Landmark, ArrowUpRight, ArrowDownLeft, CheckCircle2 } from 'lucide-react'

interface AccountStatementModalProps {
  account: Account | null
  onClose: () => void
}

export default function AccountStatementModal({ account, onClose }: AccountStatementModalProps) {
  if (!account) return null

  const { data: statementData, isLoading } = useQuery({
    queryKey: ['account-statement', account.id],
    queryFn: () => ledgerApi.getAccountStatement(account.id).then((r) => r.data),
    enabled: !!account.id,
  })

  const exportToCsv = () => {
    if (!statementData || !statementData.statement) return

    const headers = [
      'Sequence',
      'Posted At (UTC)',
      'Transaction ID',
      'Description',
      'Entry Type',
      'Amount (Major Units)',
      'Running Balance (Major Units)',
      'Counterparty Accounts',
      'Is Snapshot Point',
    ]

    const rows = statementData.statement.map((s) => [
      s.sequence_num,
      `"${s.posted_at}"`,
      `"${s.transaction_id}"`,
      `"${s.description.replace(/"/g, '""')}"`,
      s.entry_type,
      (parseInt(s.amount, 10) / 100).toFixed(2),
      (parseInt(s.running_balance, 10) / 100).toFixed(2),
      `"${s.counterparty_accounts.join(', ')}"`,
      s.is_snapshot_point ? 'YES' : 'NO',
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `statement-${account.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const balanceFormatted = (
    (parseInt(statementData?.current_balance || account.balance || '0', 10)) / 100
  ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, x: 400 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 400 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="w-full max-w-3xl h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">{account.name}</h2>
                  <span className="badge badge-cyan">
                    {account.type}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Currency: {account.currency} · Verified Account
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportToCsv}
                disabled={!statementData || statementData.statement.length === 0}
                className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Balance Summary Card */}
          <div className="p-6 bg-white border-b border-slate-200 grid grid-cols-3 gap-4">
            <div>
              <span className="text-xs text-slate-500 font-medium block">Current Ledger Balance</span>
              <span className="text-2xl font-black text-slate-900 tabular-nums tracking-tight mt-1 block">
                ${balanceFormatted}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Total Postings</span>
              <span className="text-xl font-bold text-slate-900 tabular-nums mt-1 block">
                {statementData?.total_entries || 0} events
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Overdraft Policy</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 inline-block mt-1.5 border border-slate-200">
                {account.allow_overdraft ? 'Overdraft Allowed' : 'Strict Non-Negative'}
              </span>
            </div>
          </div>

          {/* Chronological Statement Postings */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/50">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">
              <span>Chronological Activity</span>
              <span>Running Balance</span>
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-xs text-slate-500">
                Fetching account activity...
              </div>
            ) : statementData && statementData.statement.length > 0 ? (
              statementData.statement.map((entry) => {
                const isDebit = entry.entry_type === 'DEBIT'
                const amountFormatted = (parseInt(entry.amount, 10) / 100).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })
                const runningBalFormatted = (parseInt(entry.running_balance, 10) / 100).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })

                return (
                  <div
                    key={entry.entry_id}
                    className={`p-4 rounded-xl border transition-all ${
                      entry.is_snapshot_point
                        ? 'bg-indigo-50/50 border-indigo-200 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg mt-0.5 ${
                            isDebit ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {isDebit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{entry.description}</span>
                            {entry.is_snapshot_point && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold flex items-center gap-1 border border-emerald-200">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                Reconciled
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {new Date(entry.posted_at).toLocaleString()}
                          </p>
                          {entry.counterparty_accounts.length > 0 && (
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                              <span>Counterparty:</span>
                              <span className="text-slate-800 font-medium">
                                {entry.counterparty_accounts.join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`text-sm font-bold tabular-nums ${
                            isDebit ? 'text-emerald-700' : 'text-slate-900'
                          }`}
                        >
                          {isDebit ? '+' : '-'}${amountFormatted}
                        </div>
                        <div className="text-xs text-slate-500 tabular-nums mt-0.5">
                          Bal: ${runningBalFormatted}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-12 text-xs text-slate-400 bg-white rounded-xl border border-slate-200 p-8">
                No activity recorded yet for this account.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
