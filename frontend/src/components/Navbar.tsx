import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  Search,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Settings,
  Plus,
  ArrowRightLeft,
  Globe,
  UserPlus,
  Building,
} from 'lucide-react'

interface NavbarProps {
  onOpenCommandPalette: () => void
  onOpenNewAccount: () => void
  onOpenNewTransaction: () => void
  onNavigateToLanding?: () => void
  isLive: boolean
  pgConnected: boolean
  rdConnected: boolean
  latencyMs: number
}

export default function Navbar({
  onOpenCommandPalette,
  onOpenNewAccount,
  onOpenNewTransaction,
  onNavigateToLanding,
  isLive,
}: NavbarProps) {
  const { user, isAuthenticated, logout, openAuthModal, openProfileModal } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="h-16 px-4 md:px-8 border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between">
      {/* Search & Command Palette Trigger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-500 hover:text-slate-800 text-xs transition-all cursor-pointer group"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          <span className="hidden sm:inline font-medium">Search accounts, transactions, or commands...</span>
          <span className="sm:hidden font-medium">Search...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-semibold text-slate-400 shadow-2xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Global Quick Action Buttons + System Telemetry + User Auth */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Quick Action Trigger Buttons */}
        <div className="flex items-center gap-2">
          {onNavigateToLanding && (
            <button
              onClick={onNavigateToLanding}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shadow-2xs hover:border-indigo-300 hover:text-indigo-600"
              title="Return to Public SaaS Landing Page"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
              <span className="hidden lg:inline">Landing Page</span>
            </button>
          )}

          <button
            onClick={onOpenNewAccount}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">New Account</span>
          </button>

          <button
            onClick={onOpenNewTransaction}
            className="btn-tactile text-xs py-1.5 px-3.5 flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer</span>
          </button>
        </div>

        <div className="h-4 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

        {!isLive && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Connection Offline</span>
          </div>
        )}

        {/* User Auth Section */}
        {isAuthenticated && user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer shadow-2xs"
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-6 h-6 rounded-lg object-cover border border-slate-200 bg-white"
                />
              ) : (
                <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-2xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[110px]">
                  {user.name}
                </span>
                <span className="text-[10px] text-slate-400 leading-tight">
                  {user.role}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 animate-in fade-in duration-100">
                <div className="px-3 py-2.5 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                    <span
                      className={`badge ${
                        user.role === 'ADMIN'
                          ? 'badge-indigo'
                          : user.role === 'AUDITOR'
                          ? 'badge-purple'
                          : 'badge-cyan'
                      } text-[9px]`}
                    >
                      {user.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {user.email || user.phone || 'Authenticated User'}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                    <Building className="w-3 h-3 text-slate-400" />
                    <span className="truncate">{user.org_name || 'Apex Global Treasury Corp'}</span>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false)
                      openProfileModal()
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer font-medium"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Account & Profile Settings</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setDropdownOpen(false)
                      logout()
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openAuthModal('signin')}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shadow-2xs font-semibold"
            >
              <UserIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Sign In</span>
            </button>

            <button
              onClick={() => openAuthModal('signup')}
              className="btn-tactile text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer font-semibold"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

