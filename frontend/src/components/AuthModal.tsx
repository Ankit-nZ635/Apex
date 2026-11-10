import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { ledgerApi, UserRole } from '../api'
import {
  Shield,
  Sparkles,
  CheckCircle,
  Smartphone,
  ArrowRight,
  X,
  Clock,
  KeyRound,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  Building,
  Mail,
  Lock,
  User as UserIcon,
} from 'lucide-react'
import { AnimatedMeshCanvas, SettlementNotifCard } from './VisualAssets'

const COUNTRY_CODES = [
  { code: '+91', country: 'IN', flag: '🇮🇳', label: 'India (+91)' },
  { code: '+1', country: 'US', flag: '🇺🇸', label: 'United States (+1)' },
  { code: '+44', country: 'GB', flag: '🇬🇧', label: 'United Kingdom (+44)' },
  { code: '+49', country: 'DE', flag: '🇩🇪', label: 'Germany (+49)' },
  { code: '+65', country: 'SG', flag: '🇸🇬', label: 'Singapore (+65)' },
  { code: '+61', country: 'AU', flag: '🇦🇺', label: 'Australia (+61)' },
]

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, login, initialAuthMode } = useAuth()
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'phone'>('signin')

  // Sign In State
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // Sign Up (Profile Creation) State
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupOrg, setSignupOrg] = useState('')
  const [signupRole, setSignupRole] = useState<UserRole>('ADMIN')
  const [showSignupPassword, setShowSignupPassword] = useState(false)

  // Phone OTP State
  const [selectedCountry, setSelectedCountry] = useState('+1')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpUserName, setOtpUserName] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [devOtp, setDevOtp] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)

  // Shared Form State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync initial tab from openAuthModal('signup' | 'signin')
  useEffect(() => {
    if (isAuthModalOpen) {
      setActiveTab(initialAuthMode || 'signin')
      setError(null)
    }
  }, [isAuthModalOpen, initialAuthMode])

  // Countdown timer for OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  if (!isAuthModalOpen) return null

  // ─── Sign In Handler ────────────────────────────────────────────────────────
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!loginEmail.trim() || !loginPassword) {
      setError('Please enter both your work email and password.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await ledgerApi.loginWithEmail({
        email: loginEmail.trim(),
        password: loginPassword,
      })
      login(res.data.token, res.data.user)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Sign Up (Real Profile Creation) Handler ────────────────────────────────
  const handleProfileCreation = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!signupName.trim() || signupName.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).')
      return
    }

    if (!signupEmail.trim() || !signupEmail.includes('@') || !signupEmail.includes('.')) {
      setError('Please enter a valid work email address.')
      return
    }

    if (!signupPassword || signupPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await ledgerApi.register({
        name: signupName.trim(),
        email: signupEmail.trim(),
        password: signupPassword,
        role: signupRole,
        organization_name: signupOrg.trim() || undefined,
      })
      login(res.data.token, res.data.user)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create user profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── 1-Click Demo Credentials Handler ───────────────────────────────────────
  const handleDemoLogin = async (role: UserRole) => {
    setError(null)
    setIsSubmitting(true)
    try {
      const res = await ledgerApi.demoLogin(role)
      login(res.data.token, res.data.user)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Demo login failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Google OAuth Handler ───────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setError(null)
    setIsSubmitting(true)
    try {
      const res = await ledgerApi.googleLogin({
        email: 'sarah.jenkins@mercury-fintech.io',
        name: 'Sarah Jenkins',
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      })
      login(res.data.token, res.data.user)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Google Sign-In failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Mobile OTP Handlers ───────────────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const fullPhone = `${selectedCountry}${phoneNumber.replace(/\D/g, '')}`
    if (phoneNumber.trim().length < 6) {
      setError('Please enter a valid phone number.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await ledgerApi.sendPhoneOtp(fullPhone)
      setOtpSent(true)
      setCountdown(res.data.expires_in || 300)
      if (res.data.dev_otp) {
        setDevOtp(res.data.dev_otp)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP code.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const fullPhone = `${selectedCountry}${phoneNumber.replace(/\D/g, '')}`
    if (otpCode.trim().length < 4) {
      setError('Please enter the verification code.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await ledgerApi.verifyPhoneOtp(fullPhone, otpCode.trim(), otpUserName.trim() || undefined)
      login(res.data.token, res.data.user)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px]"
        >
          {/* Close button */}
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 z-20 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left Hero Pane (Animated Visual Showcase) */}
          <div className="hidden md:flex md:col-span-5 flex-col justify-between p-8 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white relative overflow-hidden">
            <AnimatedMeshCanvas />

            {/* Floating settlement notification cards */}
            <div className="absolute top-6 right-5 z-10 space-y-2.5 pointer-events-none">
              <div className="animate-stripe-float" style={{ animationDelay: '0s' }}>
                <SettlementNotifCard amount="$12,500.00" />
              </div>
              <div className="animate-stripe-float" style={{ animationDelay: '1.2s' }}>
                <SettlementNotifCard amount="$3,200.00" />
              </div>
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                  ◈
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Apex Treasury</h2>
                  <p className="text-[11px] text-blue-300">Enterprise Ledger Studio</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white leading-snug">
                  Real Double-Entry Accounting Architecture
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Cryptographically verified, append-only financial accounting platform modeled after Stripe and Mercury.
                </p>

                <div className="space-y-3 pt-4">
                  <div className="flex items-start gap-3">
                    <div className="p-1 rounded-md bg-white/10 text-emerald-400 mt-0.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">Full User Attribution</p>
                      <p className="text-[11px] text-slate-300">Every journal entry is cryptographically signed by your user identity</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-1 rounded-md bg-white/10 text-indigo-300 mt-0.5">
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">SHA-256 Hash Chain</p>
                      <p className="text-[11px] text-slate-300">Continuous mathematical defense against unauthorized balance mutations</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-1 rounded-md bg-white/10 text-amber-300 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">Multi-Tenant RBAC</p>
                      <p className="text-[11px] text-slate-300">Granular separation between Admins, Operators, and Independent Auditors</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
              <span>Secure Session Auth</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
            </div>
          </div>

          {/* Right Action Pane (Clean Daylight Light Mode) */}
          <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-white overflow-y-auto max-h-[90vh]">
            <div className="max-w-md mx-auto w-full">
              {/* Top Navigation Tabs: Sign In vs Create Account */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signin')
                    setError(null)
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'signin'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signup')
                    setError(null)
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'signup'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('phone')
                    setError(null)
                  }}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'phone'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Mobile SMS OTP"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Error Alert Banner */}
              {error && (
                <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <span className="font-bold">Error:</span> {error}
                </div>
              )}

              {/* ============================================================ */}
              {/* TAB 1: REAL SIGN IN                                         */}
              {/* ============================================================ */}
              {activeTab === 'signin' && (
                <div>
                  <div className="mb-5">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Sign In to Your Account</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Enter your verified email and password to access the studio.
                    </p>
                  </div>

                  <form onSubmit={handleEmailSignIn} className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>Work Email Address</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. sarah.jenkins@mercury-fintech.io"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 placeholder:text-slate-400"
                        autoFocus
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Password</span>
                        </label>
                        <span className="text-[11px] text-slate-400">Demo pwd: password123</span>
                      </div>
                      <div className="relative">
                        <input
                          type={showLoginPassword ? 'text' : 'password'}
                          required
                          placeholder="Enter your account password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg pl-3.5 pr-10 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                        >
                          {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full btn-primary flex items-center justify-center gap-2 cursor-pointer py-2.5 shadow-sm"
                    >
                      {isSubmitting ? (
                        <span>Signing In...</span>
                      ) : (
                        <>
                          <span>Sign In to Studio</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Switch to Sign Up */}
                  <div className="mt-4 text-center text-xs text-slate-500">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('signup')
                        setError(null)
                      }}
                      className="font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      Create your profile
                    </button>
                  </div>

                  {/* Quick Demo Credentials */}
                  <div className="mt-6 pt-5 border-t border-slate-100">
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold text-center mb-3">
                      Or 1-click test credentials
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleDemoLogin('ADMIN')}
                        disabled={isSubmitting}
                        className="p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 text-left transition-all cursor-pointer group"
                      >
                        <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-600">
                          Sarah Jenkins
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <span className="badge badge-indigo text-[9px] py-0 px-1">ADMIN</span>
                          <span>Full control</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDemoLogin('AUDITOR')}
                        disabled={isSubmitting}
                        className="p-2.5 rounded-xl bg-slate-50 hover:bg-purple-50/50 border border-slate-200 hover:border-purple-300 text-left transition-all cursor-pointer group"
                      >
                        <div className="text-xs font-bold text-slate-800 group-hover:text-purple-600">
                          Alex Rivera
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <span className="badge badge-purple text-[9px] py-0 px-1">AUDITOR</span>
                          <span>Read-only</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* TAB 2: REAL SIGN UP / PROFILE CREATION                       */}
              {/* ============================================================ */}
              {activeTab === 'signup' && (
                <div>
                  <div className="mb-5">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Create Real User Profile</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Set up your personal identity and organization in the ledger engine.
                    </p>
                  </div>

                  <form onSubmit={handleProfileCreation} className="space-y-3.5">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>Full Name</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Johnathan Vance"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 placeholder:text-slate-400"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>Work Email Address</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. jvance@acmetreasury.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Create Password (min. 6 characters)</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showSignupPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          placeholder="Choose a strong password"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-10 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                        >
                          {showSignupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>Organization (Optional)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Acme Treasury Corp"
                          value={signupOrg}
                          onChange={(e) => setSignupOrg(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 placeholder:text-slate-400"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-slate-400" />
                          <span>Access Role</span>
                        </label>
                        <select
                          value={signupRole}
                          onChange={(e) => setSignupRole(e.target.value as UserRole)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 cursor-pointer"
                        >
                          <option value="ADMIN">ADMIN (Full Ledger Authority)</option>
                          <option value="OPERATOR">OPERATOR (Standard Transfers)</option>
                          <option value="AUDITOR">AUDITOR (Read-Only Verification)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full btn-primary flex items-center justify-center gap-2 cursor-pointer py-2.5 shadow-sm mt-4"
                    >
                      {isSubmitting ? (
                        <span>Creating Profile...</span>
                      ) : (
                        <>
                          <span>Create Profile & Sign In</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Switch to Sign In */}
                  <div className="mt-4 text-center text-xs text-slate-500">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('signin')
                        setError(null)
                      }}
                      className="font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      Sign In instead
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* TAB 3: MOBILE OTP                                            */}
              {/* ============================================================ */}
              {activeTab === 'phone' && (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('signin')
                      setOtpSent(false)
                      setError(null)
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-700 mb-4 inline-flex items-center gap-1 cursor-pointer font-medium"
                  >
                    ← Back to standard Sign In
                  </button>

                  <div className="mb-5">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Mobile OTP Authentication</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Sign in using your mobile phone number with SMS verification code.
                    </p>
                  </div>

                  {!otpSent ? (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Mobile Phone Number</label>
                        <div className="flex gap-2">
                          <select
                            value={selectedCountry}
                            onChange={(e) => setSelectedCountry(e.target.value)}
                            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                          >
                            {COUNTRY_CODES.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.flag} {c.code}
                              </option>
                            ))}
                          </select>
                          <input
                            type="tel"
                            placeholder="e.g. 98765 43210"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 placeholder:text-slate-400"
                            autoFocus
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting || !phoneNumber.trim()}
                        className="w-full btn-primary flex items-center justify-center gap-2 cursor-pointer py-2.5"
                      >
                        {isSubmitting ? (
                          <span>Sending OTP...</span>
                        ) : (
                          <>
                            <span>Send Verification Code</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                      {devOtp && (
                        <div
                          onClick={() => setOtpCode(devOtp)}
                          className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between cursor-pointer hover:bg-amber-100/70 transition-all shadow-xs"
                        >
                          <div className="flex items-center gap-2">
                            <KeyRound className="w-4 h-4 text-amber-600" />
                            <span>
                              Dev Code: <strong className="text-slate-900 text-sm font-bold tracking-widest">{devOtp}</strong>
                            </span>
                          </div>
                          <span className="text-[11px] underline font-medium text-amber-700">Click to autofill</span>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-slate-700">6-Digit Verification Code</label>
                          {countdown > 0 && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {formatTimer(countdown)}
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="••••••"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-center text-xl tracking-[0.5em] font-bold tabular-nums text-slate-900 focus:outline-none focus:border-indigo-600"
                          autoFocus
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Your Name (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. Marcus Vance"
                          value={otpUserName}
                          onChange={(e) => setOtpUserName(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 placeholder:text-slate-400"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting || otpCode.length < 4}
                        className="w-full btn-primary flex items-center justify-center gap-2 cursor-pointer py-2.5"
                      >
                        {isSubmitting ? 'Verifying...' : 'Verify Code & Sign In'}
                      </button>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={countdown > 240}
                          className="text-xs text-slate-500 hover:text-indigo-600 transition-colors disabled:opacity-40 cursor-pointer font-medium"
                        >
                          Didn't receive code? Resend
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
