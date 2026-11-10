import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ledgerApi, Account, Transaction } from './api'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar, { NavTab } from './components/Sidebar'
import Navbar from './components/Navbar'
import CommandPalette from './components/CommandPalette'
import AuthModal from './components/AuthModal'
import ProfileModal from './components/ProfileModal'
import AccountStatementModal from './components/AccountStatementModal'
import DashboardPanel from './panels/DashboardPanel'
import AccountsPanel from './panels/AccountsPanel'
import JournalPanel from './panels/JournalPanel'
import TimeMachinePanel from './panels/TimeMachinePanel'
import HashChainPanel from './panels/HashChainPanel'
import LandingPage from './components/LandingPage'

function MainApp() {
  const { openAuthModal } = useAuth()
  const [viewMode, setViewMode] = useState<'landing' | 'app'>(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#app') {
      return 'app'
    }
    return 'landing'
  })

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [selectedStatementAccount, setSelectedStatementAccount] = useState<Account | null>(null)
  const [openNewAccountInAccounts, setOpenNewAccountInAccounts] = useState(false)
  const [openNewTxInAccounts, setOpenNewTxInAccounts] = useState(false)
  const [latencyMs, setLatencyMs] = useState<number>(0)

  // Sync hash changes
  useEffect(() => {
    function handleHashChange() {
      if (window.location.hash === '#app') {
        setViewMode('app')
      } else if (window.location.hash === '#landing') {
        setViewMode('landing')
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const handleLaunchApp = () => {
    setViewMode('app')
    if (typeof window !== 'undefined') {
      window.location.hash = '#app'
    }
  }

  const handleNavigateToLanding = () => {
    setViewMode('landing')
    if (typeof window !== 'undefined') {
      window.location.hash = '#landing'
    }
  }

  // Global Health & Telemetry Probe
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const start = performance.now()
      const res = await ledgerApi.health()
      const end = performance.now()
      setLatencyMs(Math.round(end - start))
      return res.data
    },
    refetchInterval: 6000,
  })

  // Global Accounts & Transactions query for Command Palette search
  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts-list'],
    queryFn: () => ledgerApi.getAccounts().then((r) => (Array.isArray(r.data) ? r.data : [])),
    refetchInterval: 8000,
  })

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: () => ledgerApi.getTransactions(50).then((r) => (Array.isArray(r.data) ? r.data : [])),
    refetchInterval: 8000,
  })

  // Keyboard shortcut for Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const isLive = health?.status === 'ONLINE' || health?.status === 'UP'
  const pgConnected = health?.services.postgres ?? false
  const rdConnected = health?.services.redis ?? false

  // Render SaaS Landing Page View
  if (viewMode === 'landing') {
    return (
      <div className="min-h-screen bg-white">
        <LandingPage
          onLaunchApp={handleLaunchApp}
          onOpenAuth={openAuthModal}
        />
        {/* Auth Modal (Real Sign In, Profile Creation & OTP) */}
        <AuthModal />
        <ProfileModal />
      </div>
    )
  }

  // Render Core Ledger Studio App View
  return (
    <div className="min-h-screen relative flex bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Collapsible Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onNavigateToLanding={handleNavigateToLanding}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Command Bar & Navbar */}
        <Navbar
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onNavigateToLanding={handleNavigateToLanding}
          onOpenNewAccount={() => {
            setActiveTab('accounts')
            setOpenNewAccountInAccounts(true)
          }}
          onOpenNewTransaction={() => {
            setActiveTab('accounts')
            setOpenNewTxInAccounts(true)
          }}
          isLive={isLive}
          pgConnected={pgConnected}
          rdConnected={rdConnected}
          latencyMs={latencyMs}
        />

        {/* Dynamic Panel Content */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {activeTab === 'dashboard' && (
                <DashboardPanel
                  onNavigateToAccounts={() => setActiveTab('accounts')}
                  onNavigateToTransactions={() => setActiveTab('transactions')}
                  onNavigateToSecurity={() => setActiveTab('security-check')}
                  onOpenNewAccount={() => {
                    setActiveTab('accounts')
                    setOpenNewAccountInAccounts(true)
                  }}
                  onOpenNewTransaction={() => {
                    setActiveTab('accounts')
                    setOpenNewTxInAccounts(true)
                  }}
                />
              )}
              {activeTab === 'accounts' && (
                <AccountsPanel
                  initialOpenAccountModal={openNewAccountInAccounts}
                  initialOpenTxModal={openNewTxInAccounts}
                  onResetInitialModals={() => {
                    setOpenNewAccountInAccounts(false)
                    setOpenNewTxInAccounts(false)
                  }}
                />
              )}
              {activeTab === 'transactions' && <JournalPanel />}
              {activeTab === 'time-machine' && <TimeMachinePanel />}
              {activeTab === 'security-check' && <HashChainPanel />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Global Footer */}
        <footer className="border-t border-slate-200 bg-white py-4 px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>Apex Global Treasury · Enterprise Ledger Platform</div>
          <div>Bank-Grade Encryption · Audit-Protected · Instant Settlement</div>
        </footer>
      </div>

      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        accounts={accounts}
        transactions={transactions}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenNewAccount={() => {
          setActiveTab('accounts')
          setOpenNewAccountInAccounts(true)
        }}
        onOpenNewTransaction={() => {
          setActiveTab('accounts')
          setOpenNewTxInAccounts(true)
        }}
        onSelectAccountStatement={(account) => setSelectedStatementAccount(account)}
      />

      {/* Auth Modal (Real Sign In, Profile Creation & OTP) */}
      <AuthModal />

      {/* Profile & Account Settings Modal (Real user details, edit & logout) */}
      <ProfileModal />

      {/* Global Account Statement Modal */}
      <AccountStatementModal
        account={selectedStatementAccount}
        onClose={() => setSelectedStatementAccount(null)}
      />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  )
}
