const monthFormatter = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' })
const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function parse(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatMonth(value: string | null | undefined): string {
  const d = parse(value)
  return d ? monthFormatter.format(d) : ''
}

export function formatDate(value: string | null | undefined): string {
  const d = parse(value)
  return d ? dateFormatter.format(d) : ''
}

export function formatDateRange(start?: string | null, end?: string | null, isCurrent?: boolean): string {
  const from = formatMonth(start)
  const to = isCurrent ? 'Present' : formatMonth(end)
  if (from && to) return `${from} – ${to}`
  return from || to
}

export function formatYearRange(start?: number | null, end?: number | null): string {
  if (start && end) return `${start} – ${end}`
  return String(start ?? end ?? '')
}

export function formatMoney(paise: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(paise / 100)
}

/** Splits newline / bullet separated text into clean list items. */
export function toLines(value: string | null | undefined): string[] {
  if (!value) return []
  return value
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean)
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

/** Groups skills by category, preserving order. Uncategorised skills go under `fallback`. */
export function groupBy<T>(items: T[], key: (item: T) => string | null | undefined, fallback = 'Skills') {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)?.trim() || fallback
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(item)
  }
  return [...groups.entries()].map(([name, values]) => ({ name, items: values }))
}
