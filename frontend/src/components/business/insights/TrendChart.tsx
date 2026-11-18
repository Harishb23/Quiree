import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Table2, LineChart } from 'lucide-react'
import { formatCount, niceMax, shortDate } from './insightsUtils'
import styles from './Insights.module.scss'

export interface TrendSeries {
  key: string
  label: string
  color: string
}

export interface TrendPoint {
  date: string
  values: Record<string, number>
}

const HEIGHT = 240
const M = { top: 14, right: 14, bottom: 30, left: 40 }

/**
 * Responsive multi-series line chart (one y-axis) with a crosshair tooltip, keyboard navigation
 * (focus the chart, then ← / →) and a table view. The first series gets a 10% area wash.
 */
export function TrendChart({ points, series, title }: { points: TrendPoint[]; series: TrendSeries[]; title: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  const [active, setActive] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)
  const descId = useId()

  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(280, Math.round(entry.contentRect.width)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [showTable])

  const n = points.length
  const max = useMemo(() => niceMax(Math.max(0, ...points.flatMap((p) => series.map((s) => p.values[s.key] ?? 0)))), [points, series])
  const allZero = points.every((p) => series.every((s) => !p.values[s.key]))

  const plotW = width - M.left - M.right
  const plotH = HEIGHT - M.top - M.bottom
  const x = (i: number) => M.left + (n <= 1 ? plotW / 2 : (i * plotW) / (n - 1))
  const y = (v: number) => M.top + plotH - (v / max) * plotH

  const linePath = (key: string) => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.values[key] ?? 0).toFixed(1)}`).join(' ')
  const areaPath = (key: string) =>
    n ? `${linePath(key)} L${x(n - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z` : ''

  const ticks = [0, max / 2, max]
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 70))))

  function onPointer(clientX: number) {
    const rect = wrapRef.current?.querySelector('svg')?.getBoundingClientRect()
    if (!rect || n === 0) return
    const px = ((clientX - rect.left) / rect.width) * width
    const i = Math.round(((px - M.left) / plotW) * (n - 1))
    setActive(Math.min(n - 1, Math.max(0, i)))
  }

  function onKey(e: KeyboardEvent) {
    if (n === 0) return
    if (e.key === 'ArrowRight') setActive((a) => Math.min(n - 1, (a ?? -1) + 1))
    else if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, (a ?? n) - 1))
    else if (e.key === 'Home') setActive(0)
    else if (e.key === 'End') setActive(n - 1)
    else if (e.key === 'Escape') setActive(null)
    else return
    e.preventDefault()
  }

  const activePoint = active !== null ? points[active] : null
  const tooltipLeft = active !== null ? Math.min(Math.max(x(active), 80), width - 80) : 0

  return (
    <div className={styles.chart}>
      <div className={styles.chartHead}>
        <ul className={styles.legend} aria-label="Legend">
          {series.map((s) => (
            <li key={s.key}>
              <span className={styles.legendKey} style={{ background: s.color }} aria-hidden />
              {s.label}
            </li>
          ))}
        </ul>
        <button type="button" className={styles.viewToggle} onClick={() => setShowTable((t) => !t)} aria-pressed={showTable}>
          {showTable ? <LineChart aria-hidden /> : <Table2 aria-hidden />}
          {showTable ? 'Chart' : 'Table'}
        </button>
      </div>

      {showTable ? (
        <div className={styles.dataTableWrap}>
          <table className={styles.dataTable}>
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                {series.map((s) => (
                  <th key={s.key} scope="col">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.date}>
                  <th scope="row">{shortDate(p.date)}</th>
                  {series.map((s) => (
                    <td key={s.key}>{formatCount(p.values[s.key] ?? 0)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          ref={wrapRef}
          className={styles.plot}
          tabIndex={0}
          role="group"
          aria-label={`${title}. Use left and right arrow keys to read daily values.`}
          aria-describedby={descId}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
          onPointerMove={(e) => onPointer(e.clientX)}
          onPointerLeave={() => setActive(null)}
        >
          <svg viewBox={`0 0 ${width} ${HEIGHT}`} width="100%" height={HEIGHT} aria-hidden>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} className={styles.grid} />
                <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className={styles.axisText}>
                  {formatCount(Math.round(t))}
                </text>
              </g>
            ))}
            {points.map((p, i) =>
              i % labelEvery === 0 || i === n - 1 ? (
                <text key={p.date} x={x(i)} y={HEIGHT - 8} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className={styles.axisText}>
                  {shortDate(p.date)}
                </text>
              ) : null,
            )}

            {series[0] && <path d={areaPath(series[0].key)} fill={series[0].color} opacity={0.1} />}
            {series.map((s) => (
              <path key={s.key} d={linePath(s.key)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            ))}

            {active !== null && (
              <g>
                <line x1={x(active)} x2={x(active)} y1={M.top} y2={M.top + plotH} className={styles.crosshair} />
                {series.map((s) => (
                  <circle key={s.key} cx={x(active)} cy={y(points[active]!.values[s.key] ?? 0)} r={4.5} fill={s.color} stroke="#fff" strokeWidth={2} />
                ))}
              </g>
            )}
          </svg>

          {allZero && <p className={styles.chartEmpty}>No activity recorded in this period yet.</p>}

          {activePoint && (
            <div className={styles.tooltip} style={{ left: tooltipLeft }} role="status">
              <strong>{shortDate(activePoint.date)}</strong>
              {series.map((s) => (
                <span key={s.key}>
                  <i style={{ background: s.color }} aria-hidden />
                  {s.label}
                  <b>{formatCount(activePoint.values[s.key] ?? 0)}</b>
                </span>
              ))}
            </div>
          )}
          <p id={descId} className="sr-only">
            {series.map((s) => `${s.label}: ${formatCount(points.reduce((sum, p) => sum + (p.values[s.key] ?? 0), 0))} in total`).join('. ')}
          </p>
        </div>
      )}
    </div>
  )
}
