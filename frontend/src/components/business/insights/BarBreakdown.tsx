import type { ReactNode } from 'react'
import { formatCount } from './insightsUtils'
import styles from './Insights.module.scss'

export interface BarItem {
  key: string
  label: string
  value: number
  icon?: ReactNode
}

/**
 * Single-series horizontal bar chart (sorted, value at the bar tip). One colour, so no legend —
 * the card title names the measure. Built from HTML so it reflows to any width.
 */
export function BarBreakdown({ items, color = '#7C4DB1', emptyText = 'Nothing recorded yet.' }: { items: BarItem[]; color?: string; emptyText?: string }) {
  const sorted = [...items].sort((a, b) => b.value - a.value)
  const max = Math.max(1, ...sorted.map((i) => i.value))
  const total = sorted.reduce((s, i) => s + i.value, 0)

  if (total === 0) return <p className={styles.mutedNote}>{emptyText}</p>

  return (
    <ul className={styles.bars}>
      {sorted.map((item) => {
        const pct = (item.value / max) * 100
        const share = Math.round((item.value / total) * 100)
        return (
          <li key={item.key} className={styles.barRow} title={`${item.label}: ${formatCount(item.value)} (${share}% of total)`}>
            <span className={styles.barLabel}>
              {item.icon}
              {item.label}
            </span>
            <span className={styles.barTrack}>
              <span className={styles.barFill} style={{ width: `${Math.max(pct, item.value > 0 ? 2 : 0)}%`, background: color }} />
              <span className={styles.barValue}>{formatCount(item.value)}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
