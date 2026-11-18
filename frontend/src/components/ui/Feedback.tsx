import type { ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './Button'
import styles from './Feedback.module.scss'

export function Spinner({ size = 28, label = 'Loading' }: { size?: number; label?: string }) {
  return (
    <span className={styles.spinner} style={{ width: size, height: size }} role="status" aria-label={label} />
  )
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className={styles.pageLoader}>
      <Spinner size={36} label={label} />
      <p>{label}</p>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className={styles.state}>
      {icon && <div className={styles.stateIcon}>{icon}</div>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className={styles.stateAction}>{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className={[styles.state, styles.error].join(' ')} role="alert">
      <div className={styles.stateIcon}>
        <AlertTriangle />
      </div>
      <h3>We couldn’t load this</h3>
      <p>{message}</p>
      {onRetry && (
        <div className={styles.stateAction}>
          <Button variant="secondary" size="sm" icon={<RefreshCw />} onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  )
}

export function Alert({ tone = 'error', children }: { tone?: 'error' | 'success' | 'info'; children: ReactNode }) {
  return (
    <div className={[styles.alert, styles[tone]].join(' ')} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}

export function Badge({
  tone = 'violet',
  children,
}: {
  tone?: 'violet' | 'green' | 'amber' | 'gray' | 'red'
  children: ReactNode
}) {
  return <span className={[styles.badge, styles[`badge_${tone}`]].join(' ')}>{children}</span>
}
