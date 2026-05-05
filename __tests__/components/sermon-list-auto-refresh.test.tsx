/**
 * Tests for the polling-on-router.refresh component used by the
 * sermons list page. Uses vitest fake timers; the next/navigation
 * `useRouter` is mocked so we can spy on .refresh() calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { SermonListAutoRefresh } from '@/components/sermon-list-auto-refresh'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

const mockAddNotification = vi.fn()
vi.mock('@/lib/notifications', () => ({
  useNotifications: () => ({ addNotification: mockAddNotification }),
}))

beforeEach(() => {
  mockRefresh.mockReset()
  vi.useFakeTimers()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('SermonListAutoRefresh', () => {
  it('does not refresh when hasActive=false', () => {
    render(<SermonListAutoRefresh hasActive={false} />)
    vi.advanceTimersByTime(60_000)
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('triggers router.refresh on each interval while hasActive=true', () => {
    render(<SermonListAutoRefresh hasActive intervalMs={15_000} />)
    expect(mockRefresh).toHaveBeenCalledTimes(0) // not on mount
    vi.advanceTimersByTime(15_000)
    expect(mockRefresh).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(15_000)
    expect(mockRefresh).toHaveBeenCalledTimes(2)
    vi.advanceTimersByTime(45_000)
    expect(mockRefresh).toHaveBeenCalledTimes(5)
  })

  it('honors a custom intervalMs', () => {
    render(<SermonListAutoRefresh hasActive intervalMs={5_000} />)
    vi.advanceTimersByTime(20_000)
    expect(mockRefresh).toHaveBeenCalledTimes(4)
  })

  it('renders nothing visible', () => {
    const { container } = render(<SermonListAutoRefresh hasActive={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('clears the interval when hasActive flips to false', () => {
    const { rerender } = render(<SermonListAutoRefresh hasActive intervalMs={1_000} />)
    vi.advanceTimersByTime(2_000)
    expect(mockRefresh).toHaveBeenCalledTimes(2)
    rerender(<SermonListAutoRefresh hasActive={false} intervalMs={1_000} />)
    vi.advanceTimersByTime(10_000)
    // Still 2 — no further calls after the prop flipped.
    expect(mockRefresh).toHaveBeenCalledTimes(2)
  })

  it('clears the interval on unmount', () => {
    const { unmount } = render(<SermonListAutoRefresh hasActive intervalMs={1_000} />)
    vi.advanceTimersByTime(1_000)
    expect(mockRefresh).toHaveBeenCalledTimes(1)
    unmount()
    vi.advanceTimersByTime(10_000)
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })
})
