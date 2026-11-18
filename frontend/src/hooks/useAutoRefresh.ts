import { useEffect, useRef } from 'react'

/**
 * Keeps owner-facing lists current while the page is open: refetches when the tab regains focus and every
 * `intervalMs` while it is visible (no polling in background tabs). Refreshes are silent: a failed refresh
 * keeps the data already on screen instead of replacing it with an error state.
 */
export function useAutoRefresh<T>(
  fetcher: () => Promise<T>,
  onData: (data: T) => void,
  { intervalMs = 30_000, enabled = true }: { intervalMs?: number; enabled?: boolean } = {},
) {
  // Refs so the latest fetcher (current filters / page) is used without restarting timers.
  const fetcherRef = useRef(fetcher)
  const onDataRef = useRef(onData)
  fetcherRef.current = fetcher
  onDataRef.current = onData

  useEffect(() => {
    if (!enabled) return
    let inFlight = false
    let cancelled = false

    const refresh = async () => {
      if (inFlight || document.visibilityState !== 'visible') return
      inFlight = true
      try {
        const data = await fetcherRef.current()
        if (!cancelled) onDataRef.current(data)
      } catch {
        // Keep showing what we have; the next tick or focus will try again.
      } finally {
        inFlight = false
      }
    }

    const timer = window.setInterval(refresh, intervalMs)
    const onVisible = () => document.visibilityState === 'visible' && void refresh()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [intervalMs, enabled])
}
