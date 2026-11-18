import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus, Sparkles } from 'lucide-react'
import { delta, formatCount } from './insightsUtils'
import styles from './Insights.module.scss'

/** KPI stat tile: label, value, optional change vs the previous period. Gold is reserved for the premium metric. */
export function BusinessAnalyticsCard({
  label,
  value,
  previous,
  icon,
  gold = false,
  hint,
}: {
  label: string
  value: number
  previous?: number
  icon: ReactNode
  gold?: boolean
  hint?: string
}) {
  const d = previous === undefined ? null : delta(value, previous)
  return (
    <div className={[styles.kpi, gold && styles.kpiGold].filter(Boolean).join(' ')} title={hint}>
      <div className={styles.kpiTop}>
        <span className={styles.kpiIcon} aria-hidden>
          {icon}
        </span>
        {d && d.kind !== 'none' && (
          <span className={[styles.delta, styles[`delta_${d.kind}`]].join(' ')} aria-label={d.label} title={d.label}>
            {d.kind === 'up' && <ArrowUpRight aria-hidden />}
            {d.kind === 'down' && <ArrowDownRight aria-hidden />}
            {d.kind === 'flat' && <Minus aria-hidden />}
            {d.kind === 'new' && <Sparkles aria-hidden />}
            {d.kind === 'new' ? 'New' : `${d.percent}%`}
          </span>
        )}
      </div>
      <strong className={styles.kpiValue}>{formatCount(value)}</strong>
      <span className={styles.kpiLabel}>{label}</span>
    </div>
  )
}
