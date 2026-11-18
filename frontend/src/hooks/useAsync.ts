import { useCallback, useEffect, useRef, useState } from 'react'
import { getErrorMessage } from '../api/client'

export interface AsyncState<T> {
  data: T | undefined
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  setData: (value: T | ((prev: T | undefined) => T)) => void
}

/** Runs an async loader on mount (and when deps change) with loading / error state. */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loaderRef = useRef(loader)
  loaderRef.current = loader
  const requestId = useRef(0)

  const run = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const result = await loaderRef.current()
      if (id === requestId.current) setData(result)
    } catch (e) {
      if (id === requestId.current) setError(getErrorMessage(e))
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error, reload: run, setData: setData as AsyncState<T>['setData'] }
}
