import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { homeFor } from '../../lib/accounts'
import type { AccountType } from '../../types/api'
import { useAuth } from '../../context/AuthContext'
import { PageLoader } from '../ui/Feedback'

/** Renders children only for authenticated users; otherwise redirects to login and returns afterwards. */
export function ProtectedRoute({ children, role }: { children: ReactNode; role?: 'Admin' }) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <PageLoader label="Checking your session…" />
  if (status !== 'authenticated' || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

/** Login / register pages: signed-in users go straight to the dashboard. */
export function GuestRoute({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  if (status === 'loading') return <PageLoader />
  if (status === 'authenticated') return <Navigate to={homeFor(user?.accountType)} replace />
  return <>{children}</>
}

/**
 * Keeps each account type in its own part of the dashboard: a business account opening a personal page
 * (or the other way round) is sent to its own home. The API enforces the same rule.
 */
export function AccountArea({ type }: { type: AccountType }) {
  const { user } = useAuth()
  if (user && user.accountType !== type) return <Navigate to={homeFor(user.accountType)} replace />
  return <Outlet />
}
