import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Zap,
  Lock,
  Copy,
  Check,
  TrendingUp,
  ArrowUpRight,
  Terminal,
  Code2,
  Layers,
  Database,
  Globe,
  CheckCircle2,
  Building2,
  ExternalLink,
  X,
  CreditCard,
  BarChart3,
  Server,
  FileCode,
  Shield,
  Activity,
  User,
} from 'lucide-react'

interface LandingPageProps {
  onLaunchApp: () => void
  onOpenAuth: (mode?: 'signin' | 'signup') => void
}

type DropdownKey = 'products' | 'solutions' | 'developers' | 'resources' | null

export default function LandingPage({ onLaunchApp, onOpenAuth }: LandingPageProps) {
  const [activeDropdown, setActiveDropdown] = useState<DropdownKey>(null)
  const [activeVisualTab, setActiveVisualTab] = useState<'metrics' | 'code' | 'curl'>('metrics')
  const [copiedCode, setCopiedCode] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [contactSubmitted, setContactSubmitted] = useState(false)
  const [contactEmail, setContactEmail] = useState('')

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const sampleTypeScriptCode = `import { ApexLedger } from '@apex/ledger-engine';

const apex = new ApexLedger({ apiKey: process.env.APEX_SECRET_KEY });

// Execute atomic double-entry transfer with 0.77ms cached replay
const transfer = await apex.transactions.post({
  idempotencyKey: 'tx_payout_8f92a10',
  description: 'Merchant Settlement & Platform Fee',
  entries: [
    { accountId: 'acc_merchant_usd', entryType: 'DEBIT', amount: 95000 },
    { accountId: 'acc_platform_fees', entryType: 'DEBIT', amount: 5000 },
    { accountId: 'acc_treasury_vault', entryType: 'CREDIT', amount: 100000 },
  ],
});

console.log('Settlement Hash:', transfer.hash); // SHA-256 cascade verified
console.log('Balance Imbalance: $0.00');         // Invariant 2 enforced`

  const sampleCurlCode = `curl -X POST https://api.apexledger.io/v1/transactions \\
  -H "Authorization: Bearer sec_live_948f10a82b" \\
  -H "Idempotency-Key: tx_req_892b1a0" \\
  -H "Content-Type: application/json" \\
  -d '{
    "description": "Global Merchant Payout",
    "entries": [
      { "account_id": "acc_merch_01", "entry_type": "DEBIT", "amount": 45000 },
      { "account_id": "acc_treasury", "entry_type": "CREDIT", "amount": 45000 }
    ]
  }'`

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* ==================================================================== */}
      {/* STRIPE-INSPIRED PASTEL MESH GRADIENT BACKDROP                        */}
      {/* ==================================================================== */}
      <div className="absolute top-0 left-0 right-0 h-[880px] overflow-hidden pointer-events-none -z-10">
        {/* Soft Violet / Pale Purple Orb */}
        <div
          className="stripe-gradient-orb w-[620px] h-[520px] -top-32 -left-20"
          style={{ background: 'radial-gradient(circle, #DDD6FE 0%, #C4B5FD 60%, transparent 100%)' }}
        />
        {/* Soft Pink / Pale Rose Orb */}
        <div
          className="stripe-gradient-orb w-[580px] h-[480px] -top-24 left-[30%]"
          style={{ background: 'radial-gradient(circle, #FBCFE8 0%, #F472B6 40%, transparent 100%)', opacity: 0.55 }}
        />
        {/* Soft Sky / Cyan Blue Orb */}
        <div
          className="stripe-gradient-orb w-[640px] h-[540px] -top-36 -right-24"
          style={{ background: 'radial-gradient(circle, #BAE6FD 0%, #60A5FA 50%, transparent 100%)', opacity: 0.65 }}
        />
        {/* Soft Amber Warmth Orb */}
        <div
          className="stripe-gradient-orb w-[420px] h-[360px] top-[260px] left-[20%]"
          style={{ background: 'radial-gradient(circle, #FEF3C7 0%, #FDE68A 50%, transparent 100%)', opacity: 0.45 }}
        />

        {/* Subtle Geometric Diagonal Stripe Sweep (Stripe Canvas Effect) */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(#0A2540 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* ==================================================================== */}
      {/* 1. MINIMALIST STICKY NAVBAR                                         */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200/60 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Brand Logo */}
          <div className="flex items-center gap-8">
            <a href="#" className="flex items-center gap-2.5 group cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-[#0A2540] to-indigo-700 flex items-center justify-center text-white font-bold text-sm shadow-xs group-hover:scale-105 transition-transform">
                ◈
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-extrabold tracking-tight text-[#0A2540]">Apex</span>
                <span className="text-[10px] font-bold tracking-widest uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                  Treasury
                </span>
              </div>
            </a>

            {/* Desktop Center Dropdown Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {/* Products Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setActiveDropdown('products')}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-[#0A2540] hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer">
                  <span>Products</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${activeDropdown === 'products' ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {activeDropdown === 'products' && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.16 }}
                      className="absolute top-full left-0 w-80 p-3 mt-1 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80 z-50"
                    >
                      <div className="space-y-1">
                        <a
                          onClick={onLaunchApp}
                          className="p-2.5 rounded-xl hover:bg-slate-50 flex items-start gap-3 transition-colors cursor-pointer group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                              Ledger Engine Core
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Strict double-entry immutability and zero balance drift.
                            </div>
                          </div>
                        </a>

                        <a
                          onClick={onLaunchApp}
                          className="p-2.5 rounded-xl hover:bg-slate-50 flex items-start gap-3 transition-colors cursor-pointer group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <Activity className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-600">
                              Time-Travel Replay
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Reconstruct account balances at any precise past millisecond.
                            </div>
                          </div>
                        </a>

                        <a
                          onClick={onLaunchApp}
                          className="p-2.5 rounded-xl hover:bg-slate-50 flex items-start gap-3 transition-colors cursor-pointer group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600">
                              Cryptographic Hash Chain
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              SHA-256 cascade integrity proof and tamper detection.
                            </div>
                          </div>
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Solutions Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setActiveDropdown('solutions')}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-[#0A2540] hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer">
                  <span>Solutions</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${activeDropdown === 'solutions' ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {activeDropdown === 'solutions' && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.16 }}
                      className="absolute top-full left-0 w-80 p-3 mt-1 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80 z-50"
                    >
                      <div className="space-y-1">
                        <div className="p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer">
                          <div className="text-xs font-bold text-slate-900">Enterprise SaaS Billing</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Automate subscription revenue, deferred revenue, and payouts.
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer">
                          <div className="text-xs font-bold text-slate-900">Multi-Sided Marketplaces</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Split payments, escrow holding, and seller settlement.
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer">
                          <div className="text-xs font-bold text-slate-900">Fintech & Neobanks</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Audit-ready, regulatory ledger with PostgreSQL immutability.
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Developers Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setActiveDropdown('developers')}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-[#0A2540] hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer">
                  <span>Developers</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${activeDropdown === 'developers' ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {activeDropdown === 'developers' && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.16 }}
                      className="absolute top-full left-0 w-80 p-3 mt-1 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80 z-50"
                    >
                      <div className="space-y-1">
                        <div className="p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer flex items-center gap-3">
                          <Terminal className="w-4 h-4 text-slate-500" />
                          <div>
                            <div className="text-xs font-bold text-slate-900">REST API Reference</div>
                            <div className="text-[11px] text-slate-500">Fastify REST endpoints & OpenAPI specs.</div>
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer flex items-center gap-3">
                          <FileCode className="w-4 h-4 text-indigo-600" />
                          <div>
                            <div className="text-xs font-bold text-slate-900">TypeScript & Node.js SDK</div>
                            <div className="text-[11px] text-slate-500">Type-safe client library with retries.</div>
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer flex items-center gap-3">
                          <Server className="w-4 h-4 text-emerald-600" />
                          <div>
                            <div className="text-xs font-bold text-slate-900">Redis Idempotency Layer</div>
                            <div className="text-[11px] text-slate-500">Sub-millisecond duplicate suppression.</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Resources Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setActiveDropdown('resources')}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-[#0A2540] hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer">
                  <span>Resources</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${activeDropdown === 'resources' ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {activeDropdown === 'resources' && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.16 }}
                      className="absolute top-full left-0 w-72 p-3 mt-1 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80 z-50"
                    >
                      <div className="space-y-1">
                        <div className="p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-xs font-medium text-slate-700">
                          Architecture Whitepaper
                        </div>
                        <div className="p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-xs font-medium text-slate-700">
                          Financial Invariants Formal Proof
                        </div>
                        <div className="p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-xs font-medium text-slate-700">
                          SOC2 Type II Compliance Guide
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Pricing Link */}
              <a
                href="#pricing"
                onClick={(e) => {
                  e.preventDefault()
                  setShowContactModal(true)
                }}
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-[#0A2540] hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Pricing
              </a>
            </nav>
          </div>

          {/* Right: Auth & Primary Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onOpenAuth('signin')}
              className="text-sm font-semibold text-slate-600 hover:text-[#0A2540] transition-colors cursor-pointer px-2.5 py-1.5"
            >
              Sign In
            </button>

            <button
              onClick={() => onOpenAuth('signup')}
              className="hidden sm:inline-flex text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded-full transition-colors cursor-pointer shadow-xs"
            >
              Create Account
            </button>

            <button
              onClick={() => setShowContactModal(true)}
              className="hidden lg:inline-flex text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-3.5 py-2 rounded-full transition-colors cursor-pointer"
            >
              Contact sales
            </button>

            <button
              onClick={onLaunchApp}
              className="stripe-btn-pill stripe-btn-pill-primary text-xs py-2 px-4 flex items-center gap-1.5 group cursor-pointer"
            >
              <span>Launch Studio</span>
              <ArrowRight className="w-3.5 h-3.5 text-white/70 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 2. HERO SECTION                                                     */}
      {/* ==================================================================== */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: High-Conversion Headline & Action Buttons */}
            <div className="lg:col-span-6 space-y-6">
              {/* Announcement Badge */}
              <div>
                <button
                  onClick={onLaunchApp}
                  className="stripe-badge-announcement cursor-pointer group"
                >
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600" />
                  </span>
                  <span className="text-xs font-semibold text-slate-700">
                    Apex Ledger Studio v2.0 is live
                  </span>
                  <span className="text-xs text-indigo-600 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    Explore Engine <ArrowRight className="w-3 h-3" />
                  </span>
                </button>
              </div>

              {/* Main Bold Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0A2540] leading-[1.08]">
                Financial infrastructure{' '}
                <span className="bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  to grow your revenue
                </span>
              </h1>

              {/* Supporting Subtext */}
              <p className="text-base sm:text-lg text-[#425466] leading-relaxed max-w-xl font-normal">
                Join ambitious startups and global enterprises that rely on Apex's deterministic double-entry ledger engine to post immutable transactions, reconstruct real-time treasury balances, and eliminate financial reconciliation drift.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <button
                  onClick={onLaunchApp}
                  className="stripe-btn-pill stripe-btn-pill-primary group text-sm shadow-md cursor-pointer"
                >
                  <span>Start now</span>
                  <ArrowRight className="w-4 h-4 text-white/80 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => setShowContactModal(true)}
                  className="stripe-btn-pill stripe-btn-pill-secondary group text-sm cursor-pointer"
                >
                  <span>Contact sales</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 -rotate-90 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* Micro Social Proof / Trust Bullets */}
              <div className="pt-4 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>0.77ms Idempotency Replay</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Strict Immutability Triggers</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Zero Balance Drift</span>
                </div>
              </div>
            </div>

            {/* Right Column: High-Tech Floating Visual Element (Interactive Card) */}
            <div className="lg:col-span-6 relative">
              {/* Satellite Floating Badge 1 (Top-Right) */}
              <div className="hidden sm:flex absolute -top-6 -right-4 z-20 animate-stripe-float bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl p-3.5 shadow-xl shadow-slate-200/50 items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Redis Cache Latency
                  </div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    <span>0.77 ms</span>
                    <span className="badge badge-emerald text-[9px] py-0 px-1.5">Sub-ms</span>
                  </div>
                </div>
              </div>

              {/* Satellite Floating Badge 2 (Bottom-Left) */}
              <div className="hidden sm:flex absolute -bottom-6 -left-6 z-20 animate-stripe-float-reverse bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl p-3.5 shadow-xl shadow-slate-200/50 items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Ledger Integrity
                  </div>
                  <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <span>100% Tamper-Proof</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>
                </div>
              </div>

              {/* Main Interactive Floating Glass Card */}
              <div className="relative bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden transition-all duration-300">
                {/* Card Top Toolbar with Tab Controls */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-400/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                    <span className="ml-2 text-xs font-medium text-slate-500">
                      apex-treasury-production
                    </span>
                  </div>

                  {/* Visual Mode Selector Tabs */}
                  <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-[11px] font-semibold">
                    <button
                      onClick={() => setActiveVisualTab('metrics')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        activeVisualTab === 'metrics'
                          ? 'bg-white text-slate-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Metrics Stream
                    </button>
                    <button
                      onClick={() => setActiveVisualTab('code')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        activeVisualTab === 'code'
                          ? 'bg-white text-slate-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      TypeScript
                    </button>
                    <button
                      onClick={() => setActiveVisualTab('curl')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        activeVisualTab === 'curl'
                          ? 'bg-white text-slate-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      cURL
                    </button>
                  </div>
                </div>

                {/* Card Content Area */}
                <div className="p-6">
                  {/* TAB 1: Live Treasury Metrics Stream */}
                  {activeVisualTab === 'metrics' && (
                    <div className="space-y-5">
                      {/* Top Metric Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            Aggregated Cash Flow (USD)
                          </div>
                          <div className="text-3xl font-extrabold text-[#0A2540] tabular-nums tracking-tight mt-0.5">
                            $2,845,920.40
                          </div>
                        </div>

                        <div className="badge badge-emerald text-xs flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>+18.4% MoM</span>
                        </div>
                      </div>

                      {/* Mini Sparkline Visualization */}
                      <div className="h-14 flex items-end gap-1.5 pt-2">
                        {[40, 55, 48, 62, 70, 65, 82, 78, 88, 92, 85, 96, 94, 100].map(
                          (val, idx) => (
                            <div
                              key={idx}
                              className="flex-1 bg-indigo-500/15 hover:bg-indigo-600 transition-colors rounded-t cursor-pointer"
                              style={{ height: `${val}%` }}
                              title={`Volume Index: ${val}%`}
                            />
                          )
                        )}
                      </div>

                      {/* Real-time Streaming Ledger Rows */}
                      <div className="space-y-2 pt-1">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Live Double-Entry Postings
                        </div>

                        {/* Stream item 1 */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className="badge badge-emerald text-[9px] font-bold">DEBIT</span>
                            <div>
                              <div className="font-semibold text-slate-900 text-xs">
                                Stripe Settlement Payout
                              </div>
                              <div className="text-[10px] text-slate-400 tabular-nums">
                                Seq #52 · 2s ago
                              </div>
                            </div>
                          </div>
                          <div className="text-right tabular-nums font-bold text-emerald-700">
                            +$4,250.00
                          </div>
                        </div>

                        {/* Stream item 2 */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className="badge badge-rose text-[9px] font-bold">CREDIT</span>
                            <div>
                              <div className="font-semibold text-slate-900 text-xs">
                                AWS Infrastructure Surcharge
                              </div>
                              <div className="text-[10px] text-slate-400 tabular-nums">
                                Seq #51 · 8s ago
                              </div>
                            </div>
                          </div>
                          <div className="text-right tabular-nums font-bold text-slate-900">
                            -$840.00
                          </div>
                        </div>

                        {/* Stream item 3 */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className="badge badge-emerald text-[9px] font-bold">DEBIT</span>
                            <div>
                              <div className="font-semibold text-slate-900 text-xs">
                                Mercury Treasury Deposit
                              </div>
                              <div className="text-[10px] text-slate-400 tabular-nums">
                                Seq #50 · 14s ago
                              </div>
                            </div>
                          </div>
                          <div className="text-right tabular-nums font-bold text-emerald-700">
                            +$12,500.00
                          </div>
                        </div>
                      </div>

                      {/* Invariant Verification Bar */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] tabular-nums text-slate-500">
                        <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Double-Entry Invariant 2 Verified
                        </span>
                        <span>Delta: $0.00 ✓</span>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: TypeScript SDK Code */}
                  {activeVisualTab === 'code' && (
                    <div className="relative">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs text-slate-500">
                        <span>transaction-service.ts</span>
                        <button
                          onClick={() => handleCopyCode(sampleTypeScriptCode)}
                          className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 cursor-pointer font-semibold"
                        >
                          {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                        </button>
                      </div>
                      <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-[11px] overflow-x-auto leading-relaxed max-h-[300px]">
                        <code>{sampleTypeScriptCode}</code>
                      </pre>
                    </div>
                  )}

                  {/* TAB 3: REST API cURL */}
                  {activeVisualTab === 'curl' && (
                    <div className="relative">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs text-slate-500">
                        <span>Terminal Execution</span>
                        <button
                          onClick={() => handleCopyCode(sampleCurlCode)}
                          className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 cursor-pointer font-semibold"
                        >
                          {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedCode ? 'Copied!' : 'Copy cURL'}</span>
                        </button>
                      </div>
                      <pre className="p-4 rounded-xl bg-slate-900 text-emerald-400 text-[11px] overflow-x-auto leading-relaxed max-h-[300px]">
                        <code>{sampleCurlCode}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 3. TECH STACK & TRUST BADGES (LOGO CLOUD)                            */}
      {/* ==================================================================== */}
      <section className="py-14 border-y border-slate-200/60 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-8">
            Powering ledger infrastructure for ambitious global teams
          </p>

          {/* Grayscale Client Logos (SVGs with Clean Contrast) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-8 items-center justify-items-center opacity-60 hover:opacity-100 transition-opacity">
            {/* Amazon Logo */}
            <div className="h-8 flex items-center justify-center grayscale hover:grayscale-0 transition-all cursor-pointer">
              <svg className="h-6 w-auto" viewBox="0 0 100 30" fill="currentColor">
                <path d="M52.3 22.8c-7.8 5.8-19.1 8.9-28.8 8.9-13.6 0-25.9-5-35.2-13.4-.7-.7-.1-1.6.8-1.1 9.9 5.8 22.1 9.2 34.6 9.2 8.6 0 18-2.3 26.5-7.1 1.3-.7 2.4.9 1.3 2.1zM54.5 20.8c-.8-1-5.3-.5-7.3-.2-.6.1-.7-.4-.2-.8 3.3-2.3 8.7-1.6 9.4-.8.7.9-.2 6.4-3.3 9-.5.4-.9.2-.7-.4.6-1.8 1.9-6.3 1.5-7.2zM27.2 4.1h4.9v16.1h-4.9V4.1zm-8.8 10.3c0-2.8-1.5-4.5-4.2-4.5-2.6 0-4.2 1.7-4.2 4.5 0 2.8 1.6 4.5 4.2 4.5 2.7 0 4.2-1.7 4.2-4.5zm4.8 0c0 5.6-3.8 8.7-8.9 8.7-5.1 0-9-3.2-9-8.7 0-5.4 3.9-8.6 9-8.6 5.1 0 8.9 3.2 8.9 8.6z" />
              </svg>
            </div>

            {/* NVIDIA Logo */}
            <div className="h-8 flex items-center justify-center grayscale hover:grayscale-0 transition-all cursor-pointer font-bold tracking-tighter text-lg font-sans">
              <span>NVIDIA</span>
            </div>

            {/* Google Cloud Logo */}
            <div className="h-8 flex items-center justify-center grayscale hover:grayscale-0 transition-all cursor-pointer font-bold text-sm tracking-tight flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full border-2 border-current" />
              <span>Google Cloud</span>
            </div>

            {/* Salesforce Logo */}
            <div className="h-8 flex items-center justify-center grayscale hover:grayscale-0 transition-all cursor-pointer font-extrabold text-sm tracking-tight">
              <span>SALESFORCE</span>
            </div>

            {/* Shopify Logo */}
            <div className="h-8 flex items-center justify-center grayscale hover:grayscale-0 transition-all cursor-pointer font-bold text-base tracking-tight flex items-center gap-1">
              <span>shopify</span>
            </div>

            {/* Linear Logo */}
            <div className="h-8 flex items-center justify-center grayscale hover:grayscale-0 transition-all cursor-pointer font-bold text-sm tracking-tight flex items-center gap-1.5">
              <span>Linear</span>
            </div>

            {/* OpenAI Logo */}
            <div className="h-8 flex items-center justify-center grayscale hover:grayscale-0 transition-all cursor-pointer font-bold text-sm tracking-tight">
              <span>OpenAI</span>
            </div>

            {/* Stripe Partner */}
            <div className="h-8 flex items-center justify-center grayscale hover:grayscale-0 transition-all cursor-pointer font-extrabold text-base tracking-tight">
              <span>stripe</span>
            </div>
          </div>

          {/* Key Infrastructure Telemetry Metrics */}
          <div className="mt-12 pt-8 border-t border-slate-200/60 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0A2540] tabular-nums tracking-tight">
                $48B+
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                Annual Transaction Volume
              </div>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0A2540] tabular-nums tracking-tight">
                99.999%
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                Engine Availability SLA
              </div>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0A2540] tabular-nums tracking-tight">
                &lt; 1 ms
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                Idempotency Cache Replay
              </div>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tabular-nums tracking-tight">
                0
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                Balance Imbalance Recorded
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 4. CALL TO ACTION STRIP (HIGH CONVERSION)                           */}
      {/* ==================================================================== */}
      <section className="py-16 bg-[#0A2540] text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Ready to modernize your financial infrastructure?
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Post your first double-entry transaction in minutes with our pre-built Fastify REST APIs and interactive time-travel engine.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowContactModal(true)}
              className="px-5 py-2.5 rounded-full border border-slate-600 hover:border-slate-400 text-sm font-semibold transition-colors cursor-pointer"
            >
              Talk to an engineer
            </button>
            <button
              onClick={onLaunchApp}
              className="px-6 py-2.5 rounded-full bg-white text-[#0A2540] hover:bg-slate-100 text-sm font-bold shadow-lg transition-transform hover:scale-105 cursor-pointer flex items-center gap-1.5"
            >
              <span>Explore Live Studio</span>
              <ArrowRight className="w-4 h-4 text-[#0A2540]" />
            </button>
          </div>
        </div>

        {/* Ambient background glow in CTA */}
        <div
          className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle, #818CF8 0%, transparent 70%)' }}
        />
      </section>

      {/* ==================================================================== */}
      {/* 5. MINIMALIST FOOTER                                                */}
      {/* ==================================================================== */}
      <footer className="py-8 bg-white border-t border-slate-200 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Apex Global Treasury Corp</span>
            <span>·</span>
            <span>Deterministic Double-Entry Ledger Engine v2.0</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <a href="#" onClick={(e) => { e.preventDefault(); onLaunchApp(); }} className="hover:text-indigo-600">
              Live Studio
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); onOpenAuth(); }} className="hover:text-indigo-600">
              Sign In
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); setShowContactModal(true); }} className="hover:text-indigo-600">
              Contact Sales
            </a>
            <span>SOC2 Type II Certified</span>
          </div>
        </div>
      </footer>

      {/* ==================================================================== */}
      {/* CONTACT SALES / BOOK DEMO MODAL                                      */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {showContactModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                    ◈
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Contact Apex Sales</h3>
                </div>
                <button
                  onClick={() => {
                    setShowContactModal(false)
                    setContactSubmitted(false)
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {contactSubmitted ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Inquiry Received</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    A solutions engineer will reach out to <strong>{contactEmail}</strong> within 1 business day with your dedicated sandbox credentials.
                  </p>
                  <button
                    onClick={() => {
                      setShowContactModal(false)
                      onLaunchApp()
                    }}
                    className="btn-tactile text-xs py-2 px-4 cursor-pointer mt-2"
                  >
                    Open Live Studio Now
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (contactEmail) setContactSubmitted(true)
                  }}
                  className="space-y-4"
                >
                  <p className="text-xs text-slate-600">
                    Schedule a 15-minute architectural walkthrough with our distributed systems engineering team.
                  </p>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Work Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="alexander@company.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="glass-input text-xs w-full py-2"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Estimated Monthly Ledger Volume
                    </label>
                    <select className="glass-input text-xs w-full py-2">
                      <option>&lt; 10,000 transactions / mo (Free Sandbox)</option>
                      <option>10,000 – 250,000 transactions / mo (Growth)</option>
                      <option>250,000+ transactions / mo (Enterprise SLA)</option>
                    </select>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowContactModal(false)}
                      className="btn-secondary text-xs py-2 px-3.5 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="stripe-btn-pill stripe-btn-pill-primary text-xs py-2 px-4 cursor-pointer"
                    >
                      Request Architecture Demo
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

