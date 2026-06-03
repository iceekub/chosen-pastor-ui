/**
 * Tests for SermonListAutoRefresh.
 * Uses vitest fake timers + vi.advanceTimersByTimeAsync so async poll()
 * callbacks fully resolve before we assert on router.refresh().
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { SermonListAutoRefresh } from '@/components/sermon-list-auto-refresh'
import type { ActiveVideo } from '@/components/sermon-list-auto-refresh'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

const mockAddNotification = vi.fn()
vi.mock('@/lib/notifications', () => ({
  useNotifications: () => ({ addNotification: mockAddNotification }),
}))

const mockFetch = vi.fn()

const activeVideo: ActiveVideo = { id: 'v1', title: 'Sunday Sermon', status: 'transcoding' }

beforeEach(() => {
  mockRefresh.mockReset()
  mockAddNotification.mockReset()
  mockFetch.mockReset()
  // Default: fetch returns the same status — no change, no refresh.
  mockFetch.mockResolvedValue({ ok: false })
  vi.stubGlobal('fetch', mockFetch)
  vi.useFakeTimers()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('SermonListAutoRefresh', () => {
  it('does nothing when hasActive=false', async () => {
    render(<SermonListAutoRefresh hasActive={false} activeVideos={[activeVideo]} />)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(mockFetch).not.toHaveBeenCalled()
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('renders nothing visible', () => {
    const { container } = render(<SermonListAutoRefresh hasActive={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('does not call router.refresh when statuses are unchanged', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'transcoding' }),
    })
    render(<SermonListAutoRefresh hasActive activeVideos={[activeVideo]} intervalMs={1_000} />)
    await vi.advanceTimersByTimeAsync(3_000)
    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('calls router.refresh only when a status changes', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'transcoding' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'uploaded' }) })
      .mockResolvedValue({ ok: true, json: async () => ({ status: 'uploaded' }) })

    render(<SermonListAutoRefresh hasActive activeVideos={[activeVideo]} intervalMs={1_000} />)

    await vi.advanceTimersByTimeAsync(1_000) // tick 1: transcoding → transcoding (no change)
    expect(mockRefresh).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1_000) // tick 2: transcoding → uploaded (changed)
    expect(mockRefresh).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1_000) // tick 3: uploaded → uploaded (no change)
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('fires video_ready notification when status transitions to ready', async () => {
    const processingVideo: ActiveVideo = { id: 'v1', title: 'Sunday Sermon', status: 'processing' }
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'processing' }) }) // no change
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'ready' }) })       // → ready

    render(<SermonListAutoRefresh hasActive activeVideos={[processingVideo]} intervalMs={1_000} />)

    await vi.advanceTimersByTimeAsync(1_000) // tick 1: no change, no notification, no refresh
    expect(mockAddNotification).not.toHaveBeenCalled()
    expect(mockRefresh).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1_000) // tick 2: → ready
    expect(mockAddNotification).toHaveBeenCalledWith({
      type: 'video_ready',
      title: processingVideo.title,
      videoId: processingVideo.id,
    })
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('pauses polling when the tab becomes hidden', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'uploaded' }) })
    render(<SermonListAutoRefresh hasActive activeVideos={[activeVideo]} intervalMs={1_000} />)

    await vi.advanceTimersByTimeAsync(1_000) // tick while visible — status changes → refresh
    expect(mockRefresh).toHaveBeenCalledTimes(1)

    // Tab goes hidden — interval should be cleared
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))

    mockRefresh.mockReset()
    await vi.advanceTimersByTimeAsync(10_000) // time passes — no ticks
    expect(mockFetch).toHaveBeenCalledTimes(1) // no new fetch calls
    expect(mockRefresh).not.toHaveBeenCalled()

    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
  })

  it('polls immediately on tab becoming visible, then resumes interval', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'uploaded' }) })
    render(<SermonListAutoRefresh hasActive activeVideos={[activeVideo]} intervalMs={1_000} />)

    // Hide the tab
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))

    // Return — should fire an immediate poll then restart interval
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(0) // flush the immediate poll promise

    expect(mockFetch).toHaveBeenCalledTimes(1) // immediate poll fired

    await vi.advanceTimersByTimeAsync(1_000) // one interval tick
    expect(mockFetch).toHaveBeenCalledTimes(2) // interval resumed

    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
  })

  it('clears the interval when hasActive flips to false', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'uploaded' }) })
    const { rerender } = render(
      <SermonListAutoRefresh hasActive activeVideos={[activeVideo]} intervalMs={1_000} />
    )
    await vi.advanceTimersByTimeAsync(1_000)
    const callsBeforeFlip = mockFetch.mock.calls.length

    rerender(<SermonListAutoRefresh hasActive={false} activeVideos={[activeVideo]} intervalMs={1_000} />)
    await vi.advanceTimersByTimeAsync(5_000)
    expect(mockFetch.mock.calls.length).toBe(callsBeforeFlip) // no new calls
  })

  it('clears the interval on unmount', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'uploaded' }) })
    const { unmount } = render(
      <SermonListAutoRefresh hasActive activeVideos={[activeVideo]} intervalMs={1_000} />
    )
    await vi.advanceTimersByTimeAsync(1_000)
    const callsBeforeUnmount = mockFetch.mock.calls.length

    unmount()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(mockFetch.mock.calls.length).toBe(callsBeforeUnmount)
  })
})
