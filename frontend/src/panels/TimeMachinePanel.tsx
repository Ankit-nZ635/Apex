import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ledgerApi, Account, AuditEvent } from '../api'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts'
import {
  History,
  Camera,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Sparkles,
  Zap,
  Calendar,
  CheckCircle2,
} from 'lucide-react'
import { VaultDial, AccountEmblem } from '../components/VisualAssets'

const TYPE_BADGE: Record<string, string> = {
  ASSET: 'badge-emerald',
  LIABILITY: 'badge-rose',
  EQUITY: 'badge-indigo',
  REVENUE: 'badge-emerald',
  EXPENSE: 'badge-amber',
}

function TimelineSlider({
  min,
  max,
  value,
  onChange,
  timestamps,
}: {
  min: number
  max: number
  value: number
  onChange: (v: number) => void
  timestamps: number[]
}) {
  return (
    <div className="relative pt-2 pb-1">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="time-slider w-full cursor-pointer"
      />
      {/* Visual tick marks for actual transaction events */}
      <div className="relative mt-2.5 h-1">
        {timestamps.map((ts, i) => {
          const pct = max > min ? ((ts - min) / (max - min)) * 100 : 0
          return (
            <div
              key={i}
              className="absolute w-1.5 h-2.5 bg-indigo-400 -top-1 rounded-full opacity-60 hover:opacity-100 hover:scale-125 transition-transform"
              style={{ left: `${pct}%` }}
              title={new Date(ts).toLocaleTimeString()}
            />
          )
        })}
      </div>
    </div>
  )
}

export default function TimeMachinePanel() {
  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts-list'],
    queryFn: () => ledgerApi.getAccounts().then((r) => (Array.isArray(r.data) ? r.data : [])),
  })

  const [selectedAccount, setSelectedAccount] = useState('')
  const [sliderValue, setSliderValue] = useState<number>(0)

  // Auto-select first account if none selected
  useEffect(() => {
    if (!selectedAccount && accounts.length > 0) {
      setSelectedAccount(accounts[0].id)
    }
  }, [accounts, selectedAccount])

  // Get full history for selected account
  const { data: fullHistory } = useQuery({
    queryKey: ['full-history', selectedAccount],
    queryFn: () => ledgerApi.getBalance(selectedAccount).then((r) => r.data),
    enabled: !!selectedAccount,
  })

  // Build timeline bounds
  const events = fullHistory?.audit_events || []
  const timestamps = events.map((e) => new Date(e.posted_at).getTime())
  const minTs = timestamps.length ? Math.min(...timestamps) - 1000 : Date.now() - 86400000
  const maxTs = Date.now()

  // Initialize slider to max when account changes
  useEffect(() => {
    setSliderValue(maxTs)
  }, [selectedAccount, maxTs])

  // Time-travel query based on slider
  const sliderDate = new Date(sliderValue)
  const { data: replayData, isFetching } = useQuery({
    queryKey: ['time-travel', selectedAccount, sliderValue],
    queryFn: () => ledgerApi.timeTravel(selectedAccount, sliderDate.toISOString()).then((r) => r.data),
    enabled: !!selectedAccount,
    staleTime: 800,
  })

  const currentBalance = parseInt(replayData?.calculated_balance || '0', 10)
  const activeAccount = accounts.find((a) => a.id === selectedAccount)

  const handleSliderChange = (v: number) => {
    setSliderValue(v)
  }

  // Quick jump presets
  const jumpToGenesis = () => setSliderValue(minTs)
  const jumpToHead = () => setSliderValue(maxTs)

  return (
    <div className="space-y-6">
      {/* Header (Max 4-6 Words Subtitle) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Time Machine</h2>
          <p className="text-xs text-slate-500 mt-0.5">Check balances at any past moment</p>
        </div>

        {/* Quick jump controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={jumpToGenesis}
            className="btn-secondary text-xs py-1.5 px-3 cursor-pointer"
          >
            Jump to Genesis
          </button>
          <button
            onClick={jumpToHead}
            className="btn-tactile text-xs py-1.5 px-3.5 cursor-pointer"
          >
            Jump to Live Head
          </button>
        </div>
      </div>

      {/* Account Selector Horizontal Grid */}
      <div className="craft-card p-5">
        <div className="flex items-center justify-between mb-3">
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Select Account to Inspect
          </label>
          <span className="text-[11px] text-slate-400">
            {accounts.length} accounts configured
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
          {accounts.map((acc) => {
            const isSelected = selectedAccount === acc.id
            return (
              <button
                key={acc.id}
                onClick={() => setSelectedAccount(acc.id)}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AccountEmblem type={acc.type} size={24} />
                  <div className="text-xs font-bold text-slate-900 truncate flex-1">{acc.name}</div>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className={`badge ${TYPE_BADGE[acc.type] || 'badge-cyan'} text-[9px]`}>
                    {acc.type}
                  </span>
                  <span className="text-[11px] text-slate-600 font-semibold tabular-nums">
                    ${(parseInt(acc.balance || '0', 10) / 100).toFixed(0)}
                  </span>
                </div>
              </button>
            )
          })}
          {accounts.length === 0 && (
            <div className="col-span-full text-slate-400 text-xs py-4 text-center">
              No accounts available yet.
            </div>
          )}
        </div>
      </div>

      {selectedAccount && (
        <>
          {/* Historical Balance Hero Card with Glowing Scrubber */}
          <div className="craft-card p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                    Point in Time
                  </span>
                  <span className="badge badge-indigo text-[10px] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Selected Date
                  </span>
                </div>
                <div className="text-base sm:text-lg font-bold text-slate-900">
                  {format(sliderDate, 'MMMM dd, yyyy · HH:mm:ss')}
                </div>
              </div>

              {/* Large Tabular Reconstructed Balance */}
              <div className="text-left md:text-right">
                <div className="text-xs text-slate-500 font-medium mb-1">
                  Balance on {format(sliderDate, 'MMM dd, yyyy')}:
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tabular-nums tracking-tight">
                  {isFetching ? (
                    <span className="text-slate-400">Loading...</span>
                  ) : (
                    `$${(currentBalance / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                  )}
                </div>
                <div className="flex items-center md:justify-end gap-1.5 mt-1.5">
                  <span className="badge badge-emerald text-[10px] flex items-center gap-1 font-sans">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Verified Historical Balance
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline Scrubber with Animated Vault Dial */}
            <div className="pt-2">
              <div className="flex items-center gap-5">
                <div className="shrink-0 flex flex-col items-center">
                  <VaultDial value={sliderValue} min={minTs} max={maxTs} />
                  <span className="text-[9px] font-semibold text-slate-400 mt-1 uppercase">Time Dial</span>
                </div>
                <div className="flex-1">
                  <TimelineSlider
                    min={minTs}
                    max={maxTs}
                    value={sliderValue}
                    onChange={handleSliderChange}
                    timestamps={timestamps}
                  />

                  <div className="flex justify-between text-[11px] text-slate-400 mt-2 font-medium">
                    <span>GENESIS ({format(new Date(minTs), 'HH:mm:ss')})</span>
                    <span className="text-indigo-600 font-bold">
                      POSITION: {format(sliderDate, 'HH:mm:ss')}
                    </span>
                    <span>LIVE HEAD (NOW)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Area Chart with Replay Line */}
          <div className="craft-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Historical Balance Trajectory
                </h3>
                <p className="text-xs text-slate-500">Stepwise balance evolution with replay cursor</p>
              </div>

              <span className="text-xs text-slate-400">
                {events.length} total events recorded
              </span>
            </div>

            {events.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart
                  data={events.map((e) => ({
                    ts: new Date(e.posted_at).getTime(),
                    balance: parseInt(e.running_balance, 10) / 100,
                  }))}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="ttGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="ts" hide />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    fontFamily="Inter, system-ui, sans-serif"
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 8,
                      fontSize: 12,
                      boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.08)',
                    }}
                    formatter={(v: any) => [`$${Number(v || 0).toFixed(2)}`, 'Balance']}
                    labelFormatter={(l: any) => (l ? format(new Date(Number(l)), 'MMM dd HH:mm:ss') : '')}
                  />
                  <ReferenceLine
                    x={sliderValue}
                    stroke="#4F46E5"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    label={{
                      value: '◀ T Cursor',
                      position: 'top',
                      fill: '#4F46E5',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  />
                  <Area
                    type="stepAfter"
                    dataKey="balance"
                    stroke="#4F46E5"
                    strokeWidth={2.2}
                    fill="url(#ttGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
                No transaction events recorded yet for this account.
              </div>
            )}
          </div>

          {/* Transactions Prior to Selected Time */}
          <div className="craft-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Transactions up to this moment
                </h3>
                <p className="text-xs text-slate-500">
                  Showing {(replayData?.audit_events || []).length} transactions recorded prior to this point in time
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              <AnimatePresence>
                {(replayData?.audit_events || []).map((ev: AuditEvent, i) => (
                  <motion.div
                    key={ev.entry_id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50/70 border border-slate-200/80 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`badge text-[10px] font-bold ${
                          ev.entry_type === 'DEBIT' ? 'badge-emerald' : 'badge-rose'
                        }`}
                      >
                        {ev.entry_type}
                      </span>
                      <span className="text-slate-500">{format(new Date(ev.posted_at), 'HH:mm:ss')}</span>
                    </div>

                    <div className="text-slate-800 font-sans text-xs flex-1 mx-3 truncate font-medium">
                      {ev.description}
                    </div>

                    <div className="text-right text-xs shrink-0">
                      <div
                        className={`font-bold tabular-nums ${
                          ev.entry_type === 'DEBIT' ? 'text-emerald-700' : 'text-slate-900'
                        }`}
                      >
                        {ev.entry_type === 'DEBIT' ? '+' : '-'}${(parseInt(ev.amount, 10) / 100).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400 tabular-nums">
                        Bal: ${(parseInt(ev.running_balance, 10) / 100).toFixed(2)}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {(!replayData?.audit_events?.length) && (
                <div className="text-slate-400 text-xs text-center py-8">
                  No events recorded before this timestamp.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
