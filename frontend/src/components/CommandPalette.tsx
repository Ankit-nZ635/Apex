import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Landmark, ShieldCheck, History, PlusCircle, ArrowUpRight, X } from 'lucide-react'
import { Account, Transaction } from '../api'
import { NavTab } from './Sidebar'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  accounts: Account[]
  transactions: Transaction[]
  onSelectTab: (tab: NavTab) => void
  onOpenNewAccount: () => void
  onOpenNewTransaction: () => void
  onSelectAccountStatement: (account: Account) => void
}

export default function CommandPalette({
  isOpen,
  onClose,
  accounts,
  transactions,
  onSelectTab,
  onOpenNewAccount,
  onOpenNewTransaction,
  onSelectAccountStatement,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
    }
  }, [isOpen])

  // Global keydown listener for Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const q = query.toLowerCase().trim()

  const filteredAccounts = accounts.filter(
    (a) =>
      a.name.toLowerCase().includes(q) ||
      a.type.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q)
  )

  const filteredTransactions = transactions.filter(
    (t) =>
      t.description.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      t.hash.toLowerCase().includes(q)
  )

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -8 }}
          className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        >
          {/* Search Header */}
          <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search accounts, transaction hashes, or jump to actions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none font-medium"
            />
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Results List */}
          <div className="overflow-y-auto p-3 space-y-4">
            {/* Quick Actions */}
            <div>
              <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider px-2 mb-1.5">
                Quick Actions
              </div>
              <div className="space-y-0.5">
                <button
                  onClick={() => {
                    onOpenNewTransaction()
                    onClose()
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between text-slate-700 hover:text-slate-900 hover:bg-blue-50/80 transition-all cursor-pointer group"
                >
                  <span className="flex items-center gap-2.5 font-medium">
                    <ArrowUpRight className="w-4 h-4 text-blue-600" />
                    <span>Post Double-Entry Transaction</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium group-hover:text-blue-600">Action</span>
                </button>

                <button
                  onClick={() => {
                    onOpenNewAccount()
                    onClose()
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between text-slate-700 hover:text-slate-900 hover:bg-indigo-50/80 transition-all cursor-pointer group"
                >
                  <span className="flex items-center gap-2.5 font-medium">
                    <PlusCircle className="w-4 h-4 text-indigo-600" />
                    <span>Create New Ledger Account</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium group-hover:text-indigo-600">Modal</span>
                </button>

                <button
                  onClick={() => {
                    onSelectTab('security-check')
                    onClose()
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between text-slate-700 hover:text-slate-900 hover:bg-emerald-50/80 transition-all cursor-pointer group"
                >
                  <span className="flex items-center gap-2.5 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Run Cryptographic Hash Chain Audit</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium group-hover:text-emerald-600">Verify</span>
                </button>

                <button
                  onClick={() => {
                    onSelectTab('time-machine')
                    onClose()
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between text-slate-700 hover:text-slate-900 hover:bg-amber-50/80 transition-all cursor-pointer group"
                >
                  <span className="flex items-center gap-2.5 font-medium">
                    <History className="w-4 h-4 text-amber-600" />
                    <span>Open Time-Travel Replay Scrubber</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium group-hover:text-amber-600">Inspect</span>
                </button>
              </div>
            </div>

            {/* Accounts */}
            {filteredAccounts.length > 0 && (
              <div>
                <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider px-2 mb-1.5">
                  Chart of Accounts ({filteredAccounts.length})
                </div>
                <div className="space-y-0.5">
                  {filteredAccounts.slice(0, 5).map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => {
                        onSelectAccountStatement(acc)
                        onClose()
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Landmark className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        <div>
                          <div className="text-slate-900 font-semibold group-hover:text-blue-600 transition-colors">
                            {acc.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {acc.type} · {acc.currency}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-slate-900 tabular-nums">
                        ${((parseInt(acc.balance || '0', 10)) / 100).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Transactions */}
            {filteredTransactions.length > 0 && (
              <div>
                <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider px-2 mb-1.5">
                  Recent Postings ({filteredTransactions.length})
                </div>
                <div className="space-y-0.5">
                  {filteredTransactions.slice(0, 5).map((tx) => (
                    <button
                      key={tx.id}
                      onClick={() => {
                        onSelectTab('transactions')
                        onClose()
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <div>
                        <div className="text-slate-900 font-medium group-hover:text-blue-600 transition-colors">
                          {tx.description}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-md flex items-center gap-1.5 mt-0.5">
                          <span className="text-emerald-700 font-medium">✓ Verified</span>
                          <span>·</span>
                          <span>{new Date(tx.posted_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 tabular-nums">
                        {new Date(tx.posted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Keybindings */}
          <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
            <span>Press ESC or click outside to dismiss</span>
            <span>Navigate with click</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
