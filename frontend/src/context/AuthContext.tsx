import React, { createContext, useContext, useState, useEffect } from 'react'
import { User, ledgerApi } from '../api'

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string, user: User) => void
  logout: () => void
  updateUser: (updatedUser: User) => void
  isAuthModalOpen: boolean
  initialAuthMode: 'signin' | 'signup'
  openAuthModal: (mode?: 'signin' | 'signup') => void
  closeAuthModal: () => void
  isProfileModalOpen: boolean
  openProfileModal: () => void
  closeProfileModal: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ledger_auth_user')
    try {
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('ledger_auth_token'))
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [initialAuthMode, setInitialAuthMode] = useState<'signin' | 'signup'>('signin')
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  useEffect(() => {
    async function initAuth() {
      const savedToken = localStorage.getItem('ledger_auth_token')
      if (savedToken) {
        try {
          const res = await ledgerApi.getMe()
          setUser(res.data)
          localStorage.setItem('ledger_auth_user', JSON.stringify(res.data))
        } catch (err) {
          // Token expired or invalid
          localStorage.removeItem('ledger_auth_token')
          localStorage.removeItem('ledger_auth_user')
          setUser(null)
          setToken(null)
        }
      }
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('ledger_auth_token', newToken)
    localStorage.setItem('ledger_auth_user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
    setIsAuthModalOpen(false)
  }

  const logout = () => {
    localStorage.removeItem('ledger_auth_token')
    localStorage.removeItem('ledger_auth_user')
    setToken(null)
    setUser(null)
    setIsProfileModalOpen(false)
  }

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser)
    localStorage.setItem('ledger_auth_user', JSON.stringify(updatedUser))
  }

  const openAuthModal = (mode: 'signin' | 'signup' = 'signin') => {
    setInitialAuthMode(mode)
    setIsAuthModalOpen(true)
  }
  const closeAuthModal = () => setIsAuthModalOpen(false)

  const openProfileModal = () => setIsProfileModalOpen(true)
  const closeProfileModal = () => setIsProfileModalOpen(false)

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
        isAuthModalOpen,
        initialAuthMode,
        openAuthModal,
        closeAuthModal,
        isProfileModalOpen,
        openProfileModal,
        closeProfileModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

