import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAutoRefresh } from './useAutoRefresh'

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
}

describe('useAutoRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setVisibility('visible')
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('refetches on an interval and when the window regains focus', async () => {
    const fetcher = vi.fn().mockResolvedValue(['new review'])
    const onData = vi.fn()
    renderHook(() => useAutoRefresh(fetcher, onData, { intervalMs: 1000 }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(onData).toHaveBeenCalledWith(['new review'])

    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('does not poll while the tab is in the background', async () => {
    setVisibility('hidden')
    const fetcher = vi.fn().mockResolvedValue([])
    renderHook(() => useAutoRefresh(fetcher, vi.fn(), { intervalMs: 1000 }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('keeps the current data when a refresh fails', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('offline'))
    const onData = vi.fn()
    renderHook(() => useAutoRefresh(fetcher, onData, { intervalMs: 1000 }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(fetcher).toHaveBeenCalled()
    expect(onData).not.toHaveBeenCalled()
  })

  it('stops refreshing after unmount', async () => {
    const fetcher = vi.fn().mockResolvedValue([])
    const { unmount } = renderHook(() => useAutoRefresh(fetcher, vi.fn(), { intervalMs: 1000 }))
    unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    expect(fetcher).not.toHaveBeenCalled()
  })
})
