import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { ledgerApi } from '../api'
import {
  User as UserIcon,
  Mail,
  Building,
  Shield,
  Phone,
  Calendar,
  Key,
  Copy,
  Check,
  LogOut,
  X,
  Sparkles,
  Camera,
  Save,
  AlertCircle,
} from 'lucide-react'

const AVATAR_SEEDS = ['Felix', 'Sarah', 'Alex', 'Rachel', 'Marcus', 'Jordan', 'Taylor', 'Morgan']

export default function ProfileModal() {
  const { user, isProfileModalOpen, closeProfileModal, logout, updateUser } = useAuth()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => {
    if (user && isProfileModalOpen) {
      setName(user.name || '')
      setPhone(user.phone || '')
      setAvatarUrl(user.avatar_url || '')
      setIsEditing(false)
      setError(null)
      setSaveSuccess(false)
      setShowLogoutConfirm(false)
    }
  }, [user, isProfileModalOpen])

  if (!isProfileModalOpen || !user) return null

  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id)
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    }
  }

  const handleRandomizeAvatar = () => {
    const randomSeed = AVATAR_SEEDS[Math.floor(Math.random() * AVATAR_SEEDS.length)]
    const newUrl = `https://api.dicebear.com/7.x/notionists/svg?seed=${randomSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`
    setAvatarUrl(newUrl)
    setIsEditing(true)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaveSuccess(false)

    if (!name.trim() || name.trim().length < 2) {
      setError('Name must be at least 2 characters long.')
      return
    }

    setIsSaving(true)
    try {
      const res = await ledgerApi.updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
      })
      updateUser(res.data)
      setIsEditing(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirmLogout = () => {
    closeProfileModal()
    logout()
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Account & Profile Settings</h2>
            </div>
            <button
              onClick={closeProfileModal}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6">
            {/* Success notification */}
            {saveSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Profile updated successfully!</span>
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Profile Overview Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-slate-200/90 flex flex-col sm:flex-row items-center gap-4">
              <div className="relative group shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={user.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md bg-white"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-xl font-bold text-white shadow-md">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleRandomizeAvatar}
                  title="Randomize avatar look"
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-white text-slate-700 border border-slate-200 shadow-xs hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-center sm:text-left flex-1 min-w-0">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 truncate">{user.name}</h3>
                  <span
                    className={`badge ${
                      user.role === 'ADMIN'
                        ? 'badge-indigo'
                        : user.role === 'AUDITOR'
                        ? 'badge-purple'
                        : 'badge-cyan'
                    } text-[10px]`}
                  >
                    {user.role}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">{user.email || 'No email registered'}</p>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[11px] text-slate-400 mt-1">
                  <Building className="w-3 h-3 text-slate-400" />
                  <span>{user.org_name || 'Apex Global Treasury Corp'}</span>
                </div>
              </div>
            </div>

            {/* Profile Edit Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Personal Details
                </span>
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    Edit Details
                  </button>
                ) : (
                  <span className="text-xs text-slate-400">Editing mode</span>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Display Name</span>
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full rounded-lg px-3 py-2 text-xs text-slate-900 border transition-all ${
                    isEditing
                      ? 'bg-white border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Registered Work Email</span>
                </label>
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600">
                  <span>{user.email || 'None'}</span>
                  <span className="badge badge-emerald text-[9px]">Verified</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Phone Number</span>
                </label>
                <input
                  type="tel"
                  disabled={!isEditing}
                  placeholder="e.g. +1 (555) 019-9000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full rounded-lg px-3 py-2 text-xs text-slate-900 border transition-all ${
                    isEditing
                      ? 'bg-white border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-slate-400" />
                  <span>Avatar Image URL</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    disabled={!isEditing}
                    placeholder="https://..."
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs text-slate-900 border transition-all ${
                      isEditing
                        ? 'bg-white border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  />
                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleRandomizeAvatar}
                      className="btn-secondary text-xs py-1.5 px-3 whitespace-nowrap cursor-pointer"
                    >
                      Pick Style
                    </button>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setName(user.name)
                      setPhone(user.phone || '')
                      setAvatarUrl(user.avatar_url || '')
                      setIsEditing(false)
                      setError(null)
                    }}
                    className="btn-secondary text-xs py-1.5 px-3 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="btn-tactile text-xs py-1.5 px-4 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
                  </button>
                </div>
              )}
            </form>

            {/* Account Metadata Grid */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Account Metadata & Permissions
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                    <Key className="w-3 h-3 text-slate-400" />
                    <span>User Account UUID</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="truncate max-w-[180px] tabular-nums font-medium">{user.id}</span>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="text-slate-400 hover:text-indigo-600 cursor-pointer p-0.5"
                      title="Copy User UUID"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Member Since</span>
                  </div>
                  <div className="text-slate-700 font-medium">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'November 2026'}
                  </div>
                </div>
              </div>

              {/* Role Explainer */}
              <div className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="font-bold">{user.role} Authority:</strong>{' '}
                  {user.role === 'ADMIN'
                    ? 'Granted full permission to create ledger accounts, post balanced journal entries, view complete statements, and verify cryptographic continuity.'
                    : user.role === 'AUDITOR'
                    ? 'Granted read-only access for forensic accounting, time-travel history replay, and SHA-256 hash chain audits.'
                    : 'Granted standard authority to post double-entry transactions and query live account balances.'}
                </div>
              </div>
            </div>

            {/* Real Logout Section */}
            <div className="pt-4 border-t border-slate-100">
              {!showLogoutConfirm ? (
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Sign Out of Session</h4>
                    <p className="text-[11px] text-slate-500">Terminates the current JWT token on this device.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="px-3.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="text-xs font-bold">Are you sure you want to sign out?</span>
                  </div>
                  <p className="text-xs text-rose-700">
                    You will be signed out of <strong>{user.name}</strong> ({user.email}). Any unsaved form inputs will be cleared.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowLogoutConfirm(false)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmLogout}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Confirm Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

