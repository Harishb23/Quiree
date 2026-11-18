import type { Review } from '../../../types/business'

/**
 * Chart series colours, validated with the dataviz palette checker (light surface):
 * lightness band, chroma floor, CVD and normal-vision separation all pass. Gold and lavender sit
 * below 3:1 contrast on white, so every chart ships a legend, a tooltip and a table view.
 */
export const SERIES_COLORS = {
  views: '#7C4DB1',
  scans: '#D4A94F',
  visitors: '#A98BD6',
} as const

export type DeltaKind = 'up' | 'down' | 'flat' | 'new' | 'none'

export interface Delta {
  kind: DeltaKind
  /** Whole-number percentage change (absolute value), when computable. */
  percent: number | null
  label: string
}

/** Change of `current` versus the previous period of equal length. */
export function delta(current: number, previous: number): Delta {
  if (previous === 0 && current === 0) return { kind: 'none', percent: null, label: 'No activity in either period' }
  if (previous === 0) return { kind: 'new', percent: null, label: 'New this period' }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return { kind: 'flat', percent: 0, label: 'Same as previous period' }
  return { kind: pct > 0 ? 'up' : 'down', percent: Math.abs(pct), label: `${pct > 0 ? 'Up' : 'Down'} ${Math.abs(pct)}% vs previous period` }
}

const compactFormatter = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 })
const fullFormatter = new Intl.NumberFormat('en-IN')

/** 1,284 below 10,000; compact above (12.9K). */
export const formatCount = (n: number) => (Math.abs(n) < 10000 ? fullFormatter.format(n) : compactFormatter.format(n))

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** "just now", "5 minutes ago", "yesterday", "3 days ago" … falls back to a date after 30 days. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return ''
  const seconds = Math.round((then.getTime() - now.getTime()) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 45) return 'just now'
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour')
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), 'day')
  return then.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** "18 Nov" style axis / tooltip date for a yyyy-MM-dd string. */
export function shortDate(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/** Rounds an axis maximum up to a clean value (1, 2, 5 × 10^n). */
export function niceMax(value: number): number {
  if (value <= 4) return 4
  const pow = 10 ** Math.floor(Math.log10(value))
  const n = value / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
}

/** Average and 1–5 distribution of approved reviews (the ones customers actually see). */
export function summarize(reviews: Review[]) {
  const approved = reviews.filter((r) => r.status === 'Approved')
  const distribution = [0, 0, 0, 0, 0]
  for (const r of approved) distribution[r.rating - 1]! += 1
  const average = approved.length ? Math.round((approved.reduce((s, r) => s + r.rating, 0) / approved.length) * 10) / 10 : 0
  return { average, count: approved.length, distribution }
}

