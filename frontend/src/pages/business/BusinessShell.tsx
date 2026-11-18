import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { businessApi } from '../../api/businessApi'
import { useAsync } from '../../hooks/useAsync'
import { hasRole, ROLE_LABELS } from '../../lib/business'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState, PageLoader } from '../../components/ui/Feedback'
import type { BusinessDetail, BusinessRole } from '../../types/business'

interface BusinessContextValue {
  business: BusinessDetail
  role: BusinessRole
  /** True when the signed-in user's role is at least `minimum` (mirrors server checks). */
  can: (minimum: BusinessRole) => boolean
  setBusiness: (b: BusinessDetail) => void
  reload: () => Promise<void>
}

const BusinessContext = createContext<BusinessContextValue | null>(null)

export function useBusiness(): BusinessContextValue {
  const ctx = useContext(BusinessContext)
  if (!ctx) throw new Error('useBusiness must be used inside <BusinessShell>')
  return ctx
}

/** Test / preview helper: provides a business without fetching. */
export function BusinessProvider({ business, children }: { business: BusinessDetail; children: ReactNode }) {
  const value = useMemo<BusinessContextValue>(
    () => ({
      business,
      role: business.myRole,
      can: (m) => hasRole(business.myRole, m),
      setBusiness: () => {},
      reload: async () => {},
    }),
    [business],
  )
  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
}

/** Route element for /dashboard/business/:businessId/* — loads the business once for all child pages. */
export default function BusinessShell() {
  const { businessId = '' } = useParams()
  const state = useAsync(() => businessApi.get(businessId), [businessId])
  const { setData } = state

  const setBusiness = useCallback((b: BusinessDetail) => setData(b), [setData])
  const value = useMemo<BusinessContextValue | null>(
    () =>
      state.data
        ? {
            business: state.data,
            role: state.data.myRole,
            can: (m) => hasRole(state.data!.myRole, m),
            setBusiness,
            reload: state.reload,
          }
        : null,
    [state.data, state.reload, setBusiness],
  )

  if (state.loading && !state.data) return <PageLoader label="Loading business…" />
  if (state.error || !value) {
    return (
      <>
        <ErrorState message={state.error ?? 'Business not found.'} onRetry={state.reload} />
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Button to="/dashboard/business" variant="ghost">
            Back to my businesses
          </Button>
        </div>
      </>
    )
  }

  return (
    <BusinessContext.Provider value={value}>
      <Outlet />
    </BusinessContext.Provider>
  )
}

/** Renders children only when the user's business role allows it; otherwise explains why. */
export function RequireBusinessRole({ minimum, children }: { minimum: BusinessRole; children: ReactNode }) {
  const { can, role, business } = useBusiness()
  if (can(minimum)) return <>{children}</>
  return (
    <EmptyState
      icon={<Lock />}
      title="You don’t have access to this section"
      description={`Your role on ${business.name} is ${ROLE_LABELS[role].label}. This section needs ${ROLE_LABELS[minimum].label} access or higher — ask the business owner if you need it.`}
      action={
        <Button to={`/dashboard/business/${business.id}`} variant="secondary" size="sm">
          Back to business dashboard
        </Button>
      }
    />
  )
}
