import type { ReactNode } from 'react'
import {
  BrainCircuit,
  Check,
  Contact,
  Crown,
  Layers,
  Lock,
  Palette,
  QrCode,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge, ErrorState, Spinner } from '../../components/ui/Feedback'
import { subscriptionApi } from '../../api/endpoints'
import { useAsync } from '../../hooks/useAsync'
import { useAuth } from '../../context/AuthContext'
import { formatMoney, initials } from '../../lib/format'
import { founder, type FeatureItem } from '../../content/siteContent'
import type { Plan } from '../../types/api'
import styles from './Marketing.module.scss'

const featureIcons: Record<FeatureItem['icon'], ReactNode> = {
  layers: <Layers />,
  qr: <QrCode />,
  contact: <Contact />,
  smartphone: <Smartphone />,
  palette: <Palette />,
  memory: <BrainCircuit />,
  shield: <ShieldCheck />,
  lock: <Lock />,
}

export function FeatureIcon({ icon }: { icon: FeatureItem['icon'] }) {
  return <span className={styles.featureIcon}>{featureIcons[icon]}</span>
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  id,
}: {
  eyebrow?: string
  title: ReactNode
  subtitle?: ReactNode
  align?: 'center' | 'left'
  id?: string
}) {
  return (
    <div className={[styles.sectionHeading, align === 'left' && styles.left].filter(Boolean).join(' ')}>
      {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
      <h2 id={id}>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  )
}

function durationLabel(days: number) {
  if (days <= 0) return 'forever'
  if (days === 30 || days === 31) return 'month'
  if (days === 365) return 'year'
  return `${days} days`
}

function PlanCard({ plan, highlighted }: { plan: Plan; highlighted: boolean }) {
  const { status } = useAuth()
  const isFree = plan.priceInPaise <= 0
  const target = status === 'authenticated' ? '/dashboard/subscription' : '/register'
  const perks = [
    `Up to ${plan.maxModes} professional modes`,
    plan.allowsPremiumTemplates ? 'All 10 premium templates' : 'Essential glass templates',
    'One permanent QR code',
    'Save Contact (vCard) & Add to Home Screen',
    'Viewer mode memory',
  ]
  return (
    <article className={[styles.planCard, highlighted && styles.planHighlighted].filter(Boolean).join(' ')}>
      {highlighted && (
        <span className={styles.planRibbon}>
          <Crown size={13} /> Most popular
        </span>
      )}
      <h3>{plan.name}</h3>
      <p className={styles.planDesc}>{plan.description}</p>
      <div className={styles.planPrice}>
        <strong>{isFree ? 'Free' : formatMoney(plan.priceInPaise, plan.currency)}</strong>
        <span>/ {durationLabel(plan.durationDays)}</span>
      </div>
      <ul className={styles.checkList}>
        {perks.map((p) => (
          <li key={p}>
            <Check size={16} /> {p}
          </li>
        ))}
      </ul>
      <Button to={target} variant={highlighted ? 'primary' : 'secondary'} fullWidth>
        {isFree ? 'Start for free' : `Choose ${plan.name}`}
      </Button>
    </article>
  )
}

/** Plan cards loaded from the API (shared by the home page preview and the pricing page). */
export function PlanGrid() {
  const { data: plans, loading, error, reload } = useAsync(() => subscriptionApi.plans(), [])

  if (loading)
    return (
      <div className={styles.centered}>
        <Spinner label="Loading plans" />
      </div>
    )
  if (error) return <ErrorState message={error} onRetry={() => void reload()} />
  if (!plans?.length) return <p className={styles.centered}>Plans will be announced soon.</p>

  const paid = plans.filter((p) => p.priceInPaise > 0)
  const highlightId = paid.length ? paid.reduce((a, b) => (a.priceInPaise <= b.priceInPaise ? a : b)).id : -1

  return (
    <div className={styles.planGrid}>
      {plans.map((plan) => (
        <PlanCard key={plan.id} plan={plan} highlighted={plan.id === highlightId} />
      ))}
    </div>
  )
}

export function FounderCard() {
  return (
    <div className={styles.founder}>
      <div className={styles.founderAvatar} aria-hidden>
        {initials(founder.name)}
      </div>
      <div className={styles.founderBody}>
        <Badge>{founder.title}</Badge>
        <h3>{founder.name}</h3>
        {founder.bio.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <blockquote>“{founder.quote}”</blockquote>
      </div>
    </div>
  )
}

/** Decorative QR-style graphic. It is an illustration only and does not encode a real URL. */
export function DecorativeQr({ size = 180 }: { size?: number }) {
  const n = 21
  const cells: ReactNode[] = []
  const finder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7)
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (finder(r, c)) continue
      // Deterministic pseudo-random pattern
      if (((r * 31 + c * 17 + r * c) % 7) % 3 === 0) {
        cells.push(<rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} rx={0.2} />)
      }
    }
  }
  const eye = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x + 0.5} y={y + 0.5} width={6} height={6} rx={1.4} fill="none" stroke="currentColor" strokeWidth={1} />
      <rect x={x + 2} y={y + 2} width={3} height={3} rx={0.7} />
    </g>
  )
  return (
    <svg
      width={size}
      height={size}
      viewBox={`-1 -1 ${n + 2} ${n + 2}`}
      fill="currentColor"
      role="img"
      aria-label="Illustration of a QR code"
    >
      <rect x={-1} y={-1} width={n + 2} height={n + 2} rx={2} fill="#fff" />
      <g fill="#1b1340" color="#1b1340">
        {cells}
        {eye(0, 0)}
        {eye(n - 7, 0)}
        {eye(0, n - 7)}
      </g>
    </svg>
  )
}

export function CtaBanner({ title, subtitle }: { title: string; subtitle: string }) {
  const { status } = useAuth()
  return (
    <section className={styles.section}>
      <div className={styles.cta}>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <Button to={status === 'authenticated' ? '/dashboard' : '/register'} size="lg">
          {status === 'authenticated' ? 'Open Dashboard' : 'Get Started Now'}
        </Button>
      </div>
    </section>
  )
}
