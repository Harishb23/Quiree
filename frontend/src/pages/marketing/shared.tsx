import type { ReactNode } from 'react'
import {
  BrainCircuit,
  Check,
  Contact,
  Crown,
  Layers,
  Lock,
  Minus,
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
import { homeFor } from '../../lib/accounts'
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
  const { status, user } = useAuth()
  const isFree = plan.priceInPaise <= 0
  // Plans apply to personal accounts; business accounts are sent to their own dashboard.
  const target = status === 'authenticated' ? (user?.accountType === 'Business' ? homeFor('Business') : '/dashboard/subscription') : '/register'
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
      <Button to={target} variant={highlighted ? 'primary' : 'outline'} fullWidth>
        {isFree ? 'Start for free' : `Choose ${plan.name}`}
      </Button>
    </article>
  )
}

/** Feature comparison built only from configured plan data — nothing here is hard-coded per plan. */
function PlanComparison({ plans }: { plans: Plan[] }) {
  const yes = (
    <span className={styles.compareYes}>
      <Check size={16} aria-hidden />
      <span className="sr-only">Included</span>
    </span>
  )
  const no = (
    <span className={styles.compareNo}>
      <Minus size={16} aria-hidden />
      <span className="sr-only">Not included</span>
    </span>
  )
  const rows: { label: string; value: (p: Plan) => ReactNode }[] = [
    {
      label: 'Price',
      value: (p) =>
        p.priceInPaise <= 0 ? 'Free' : `${formatMoney(p.priceInPaise, p.currency)} / ${durationLabel(p.durationDays)}`,
    },
    { label: 'Profile modes', value: (p) => `Up to ${p.maxModes}` },
    { label: 'Premium templates', value: (p) => (p.allowsPremiumTemplates ? yes : no) },
    { label: 'One permanent QR code', value: () => yes },
    { label: 'Save Contact (vCard)', value: () => yes },
    { label: 'Add to Home Screen', value: () => yes },
    { label: 'Privacy controls', value: () => yes },
  ]
  return (
    <div className={styles.compareWrap} tabIndex={0} role="region" aria-label="Plan comparison">
      <table className={styles.compare}>
        <caption className="sr-only">Feature comparison across plans</caption>
        <thead>
          <tr>
            <th scope="col">Feature</th>
            {plans.map((p) => (
              <th key={p.id} scope="col">
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              {plans.map((p) => (
                <td key={p.id}>{row.value(p)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Plan cards loaded from the API (shared by the home page preview and the pricing page). */
export function PlanGrid({ comparison = false }: { comparison?: boolean }) {
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
    <>
      <div className={styles.planGrid}>
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} highlighted={plan.id === highlightId} />
        ))}
      </div>
      {comparison && plans.length > 1 && <PlanComparison plans={plans} />}
    </>
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
      <g fill="#30243d" color="#30243d">
        {cells}
        {eye(0, 0)}
        {eye(n - 7, 0)}
        {eye(0, n - 7)}
      </g>
    </svg>
  )
}

export function CtaBanner({
  title,
  subtitle,
  secondary,
}: {
  title: string
  subtitle: string
  secondary?: { label: string; to: string }
}) {
  const { status, user } = useAuth()
  return (
    <section className={styles.section} aria-label={title}>
      <div className={styles.cta}>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div className={styles.ctaActions}>
          <Button to={status === 'authenticated' ? homeFor(user?.accountType) : '/register'} size="lg" variant="premium">
            {status === 'authenticated' ? 'Open Dashboard' : 'Get Started Now'}
          </Button>
          {secondary && (
            <Button to={secondary.to} size="lg" variant="light">
              {secondary.label}
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
