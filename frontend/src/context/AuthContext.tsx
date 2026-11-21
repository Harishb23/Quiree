import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onUnauthorized } from '../api/client'
import { authApi } from '../api/endpoints'
import { tokenStorage } from '../lib/tokenStorage'
import { clearWidget } from '../lib/nativeWidget'
import type { AccountType, AuthResponse, CurrentUser, RegisterRequest } from '../types/api'

type Status = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  status: Status
  user: CurrentUser | null
  login: (email: string, password: string) => Promise<CurrentUser>
  register: (request: RegisterRequest) => Promise<CurrentUser>
  loginWithGoogle: (idToken: string, accountType?: AccountType) => Promise<CurrentUser>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  updateUser: (patch: Partial<CurrentUser>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [status, setStatus] = useState<Status>(() => (tokenStorage.get() ? 'loading' : 'anonymous'))

  // Restore the session from a stored token; the API is the source of truth for validity.
  useEffect(() => {
    if (!tokenStorage.get()) return
    authApi
      .me()
      .then((u) => {
        setUser(u)
        setStatus('authenticated')
      })
      .catch(() => {
        tokenStorage.clear()
        setStatus('anonymous')
      })
  }, [])

  useEffect(
    () =>
      onUnauthorized(() => {
        setUser(null)
        setStatus('anonymous')
      }),
    [],
  )

  const accept = useCallback((res: AuthResponse) => {
    tokenStorage.set(res.accessToken)
    setUser(res.user)
    setStatus('authenticated')
    return res.user
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      login: async (email, password) => accept(await authApi.login(email, password)),
      register: async (request) => accept(await authApi.register(request)),
      loginWithGoogle: async (idToken, accountType) => accept(await authApi.google(idToken, accountType)),
      logout: async () => {
        try {
          await authApi.logout()
        } catch {
          /* token may already be invalid - logging out locally is what matters */
        }
        tokenStorage.clear()
        // Don't leave this account's QR on the phone's home-screen widget (Quiree app only).
        void clearWidget()
        setUser(null)
        setStatus('anonymous')
      },
      refreshUser: async () => setUser(await authApi.me()),
      updateUser: (patch) => setUser((prev) => (prev ? { ...prev, ...patch } : prev)),
    }),
    [status, user, accept],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
