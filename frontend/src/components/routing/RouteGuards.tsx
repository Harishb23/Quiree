import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
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
  const { status } = useAuth()
  if (status === 'loading') return <PageLoader />
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
