vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

const mockRouterPush = vi.fn()
const mockRouterRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, refresh: mockRouterRefresh }),
}))

const mockAddNotification = vi.fn()
vi.mock('@/lib/notifications', () => ({
  useNotifications: () => ({ addNotification: mockAddNotification }),
}))

const mockUploadToS3 = vi.fn()
vi.mock('@/lib/upload', () => ({ uploadToS3: (...args: unknown[]) => mockUploadToS3(...args) }))

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SermonDetailClient } from '@/components/sermon-detail-client'
import {
  makeVideo as makeVideoBase,
  makeGardenListItem,
  makeDownloadAttempt,
} from '../factories'

// Reset fetch mock between tests
const mockFetch = vi.fn()
beforeEach(() => {
  mockFetch.mockReset()
  mockUploadToS3.mockReset()
  mockUploadToS3.mockResolvedValue(undefined)
  vi.stubGlobal('fetch', mockFetch)
})
afterEach(() => {
  vi.unstubAllGlobals()
})

const makeVideo = (overrides = {}) => makeVideoBase({ id: 'vid-1', title: 'Sunday Sermon', ...overrides })
const makeGarden = (overrides = {}) => makeGardenListItem({ video_id: 'vid-1', topic: 'Faith', ...overrides })

describe('SermonDetailClient — header', () => {
  it('renders the Ready status badge', () => {
    render(<SermonDetailClient initialVideo={makeVideo({ status: 'ready' })} initialGardens={[]} />)
    expect(screen.getByText('Ready')).toBeInTheDocument()
  })

  it('renders the Processing status badge when processing', () => {
    render(<SermonDetailClient initialVideo={makeVideo({ status: 'processing' })} initialGardens={[]} />)
    expect(screen.getByText('Processing')).toBeInTheDocument()
  })

})

describe('SermonDetailClient — processing state', () => {
  it('shows processing banner when status is processing', () => {
    render(<SermonDetailClient initialVideo={makeVideo({ status: 'processing' })} initialGardens={[]} />)
    expect(screen.getByText('Processing video…')).toBeInTheDocument()
  })

  it('shows processing banner when status is uploaded', () => {
    render(<SermonDetailClient initialVideo={makeVideo({ status: 'uploaded' })} initialGardens={[]} />)
    expect(screen.getByText('Processing video…')).toBeInTheDocument()
  })

  it('does not show processing banner when status is ready', () => {
    render(<SermonDetailClient initialVideo={makeVideo({ status: 'ready' })} initialGardens={[]} />)
    expect(screen.queryByText('Processing video…')).not.toBeInTheDocument()
  })
})

describe('SermonDetailClient — pending_upload state', () => {
  it('shows Upload incomplete banner when status is pending_upload', () => {
    render(<SermonDetailClient initialVideo={makeVideo({ status: 'pending_upload' })} initialGardens={[]} />)
    expect(screen.getByText('Upload incomplete')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Re-upload file' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument()
  })

  it('does not show processing banner when status is pending_upload', () => {
    render(<SermonDetailClient initialVideo={makeVideo({ status: 'pending_upload' })} initialGardens={[]} />)
    expect(screen.queryByText('Processing video…')).not.toBeInTheDocument()
  })

  it('Discard calls DELETE and navigates to /sermons', async () => {
    vi.stubGlobal('confirm', () => true)
    mockFetch.mockResolvedValueOnce({ ok: true })
    render(<SermonDetailClient initialVideo={makeVideo({ status: 'pending_upload' })} initialGardens={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/videos/vid-1', { method: 'DELETE' })
      expect(mockRouterPush).toHaveBeenCalledWith('/sermons')
    })
  })

  it('Re-upload success shows confirmation message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ presigned_upload_url: 'https://s3.example.com/put', video_id: 'vid-1' }),
    })
    render(<SermonDetailClient initialVideo={makeVideo({ status: 'pending_upload' })} initialGardens={[]} />)

    const fileInput = document.querySelector('input[accept="video/*"]') as HTMLInputElement
    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: [new File(['v'], 'sermon.mp4', { type: 'video/mp4' })],
        configurable: true,
      })
      fileInput.dispatchEvent(new Event('change', { bubbles: true }))
    })

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    await waitFor(() =>
      expect(screen.getByText(/Uploaded — processing will begin shortly/i)).toBeInTheDocument()
    )
  })
})

describe('SermonDetailClient — error state', () => {
  it('shows error banner when status is error', () => {
    render(<SermonDetailClient initialVideo={makeVideo({ status: 'error' })} initialGardens={[]} />)
    expect(screen.getByText('Processing failed')).toBeInTheDocument()
  })

  it('shows error_message when provided', () => {
    render(
      <SermonDetailClient
        initialVideo={makeVideo({ status: 'error', error_message: 'Transcode failed' })}
        initialGardens={[]}
      />
    )
    expect(screen.getByText('Transcode failed')).toBeInTheDocument()
  })
})

describe('SermonDetailClient — transcript', () => {
  it('shows transcript toggle when ready and transcript exists', () => {
    render(
      <SermonDetailClient
        initialVideo={makeVideo({ status: 'ready', transcript: 'In the beginning...' })}
        initialGardens={[]}
      />
    )
    expect(screen.getByText('Transcript')).toBeInTheDocument()
    expect(screen.getByText('Show')).toBeInTheDocument()
  })

  it('toggles transcript content on click', async () => {
    render(
      <SermonDetailClient
        initialVideo={makeVideo({ status: 'ready', transcript: 'In the beginning...' })}
        initialGardens={[]}
      />
    )
    expect(screen.queryByText('In the beginning...')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Show'))
    expect(screen.getByText('In the beginning...')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Hide'))
    expect(screen.queryByText('In the beginning...')).not.toBeInTheDocument()
  })
})

describe('SermonDetailClient — generate gardens', () => {
  it('shows auto-generating status when ready, primary, and no gardens', () => {
    render(<SermonDetailClient initialVideo={makeVideo({ status: 'ready', role: 'primary' })} initialGardens={[]} />)
    expect(screen.getByText('Gardens are generating automatically…')).toBeInTheDocument()
  })

  it('does not show auto-generating status when gardens already exist', () => {
    render(
      <SermonDetailClient
        initialVideo={makeVideo({ status: 'ready', role: 'primary' })}
        initialGardens={[makeGarden()]}
      />
    )
    expect(screen.queryByText('Gardens are generating automatically…')).not.toBeInTheDocument()
  })

  it('does not show auto-generating status when video is not ready', () => {
    render(<SermonDetailClient initialVideo={makeVideo({ status: 'processing', role: 'primary' })} initialGardens={[]} />)
    expect(screen.queryByText('Gardens are generating automatically…')).not.toBeInTheDocument()
  })

  it('shows manual generate form when custom instructions link is clicked', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [makeGarden({ status: 'generating' })],
    })

    render(<SermonDetailClient initialVideo={makeVideo({ status: 'ready', role: 'primary' })} initialGardens={[]} />)
    fireEvent.click(screen.getByText('Generate with custom instructions instead'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Generate Gardens' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Generate Gardens' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/videos/vid-1/generate-gardens',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })

  it('passes instructions when provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [makeGarden({ status: 'ready' })],
    })

    render(<SermonDetailClient initialVideo={makeVideo({ status: 'ready', role: 'primary' })} initialGardens={[]} />)
    fireEvent.click(screen.getByText('Generate with custom instructions instead'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/specific focus areas/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText(/specific focus areas/i), {
      target: { value: 'Focus on grace' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Generate Gardens' }))

    await waitFor(() => {
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.instructions).toBe('Focus on grace')
    })
  })

  it('shows error message when generate fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Backend unavailable' }),
    })

    render(<SermonDetailClient initialVideo={makeVideo({ status: 'ready', role: 'primary' })} initialGardens={[]} />)
    fireEvent.click(screen.getByText('Generate with custom instructions instead'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Generate Gardens' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Generate Gardens' }))

    await waitFor(() => {
      expect(screen.getByText('Backend unavailable')).toBeInTheDocument()
    })
  })
})

describe('SermonDetailClient — ignored video override', () => {
  // week_anchor_sunday = 2026-04-26; Saturday = 2026-05-02.
  // Tests mock Date to a day inside that week so overrideRangeLabel is non-null.

  beforeEach(() => {
    // Freeze "today" to 2026-04-28 (Tuesday inside the factory's garden week)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-28T10:00:00'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows supplementary video notice when video is ready but not primary', () => {
    render(<SermonDetailClient initialVideo={makeVideo({ status: 'ready', role: 'ignored' })} initialGardens={[]} />)
    expect(screen.getByText(/supplementary video/i)).toBeInTheDocument()
  })

  it('does not show the Generate Gardens form for an ignored video', () => {
    render(<SermonDetailClient initialVideo={makeVideo({ status: 'ready', role: 'ignored' })} initialGardens={[]} />)
    expect(screen.queryByRole('button', { name: 'Generate Gardens' })).not.toBeInTheDocument()
  })

  it('shows begin regeneration button with date range', () => {
    render(<SermonDetailClient initialVideo={makeVideo({ status: 'ready', role: 'ignored' })} initialGardens={[]} />)
    // Tomorrow = Wed Apr 29; Saturday = Sat May 2 (within fake-timer week)
    expect(screen.getByRole('button', { name: /begin regeneration/i })).toBeInTheDocument()
  })

  it('shows the primary sermon link when weekPrimary is provided', () => {
    const primary = { ...makeVideo({ id: 'primary-1', video_date: '2026-04-26', role: 'primary' }) }
    render(
      <SermonDetailClient
        initialVideo={makeVideo({ status: 'ready', role: 'ignored' })}
        initialGardens={[]}
        weekPrimary={primary}
      />
    )
    expect(screen.getByRole('link', { name: /sermon from/i })).toBeInTheDocument()
  })

  it('sends force: true when the begin regeneration button is clicked', () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [makeGarden({ status: 'generating' })],
    })

    render(<SermonDetailClient initialVideo={makeVideo({ status: 'ready', role: 'ignored' })} initialGardens={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /begin regeneration/i }))

    // fetch() is invoked synchronously before the first await in
    // handleGenerateGardens, so we can assert without waitFor
    // (which would hang with vi.useFakeTimers active).
    const call = mockFetch.mock.calls[0]
    expect(call).toBeDefined()
    const body = JSON.parse(call[1].body)
    expect(body.force).toBe(true)
  })
})

describe('SermonDetailClient — gardens list', () => {
  it('shows generating state when a garden has status generating', () => {
    render(
      <SermonDetailClient
        initialVideo={makeVideo({ status: 'ready' })}
        initialGardens={[makeGarden({ status: 'generating' })]}
      />
    )
    expect(screen.getByText('Generating gardens…')).toBeInTheDocument()
  })
})


describe('SermonDetailClient — primary notifier', () => {
  it('shows the primary notifier when the video is primary', () => {
    render(<SermonDetailClient initialVideo={makeVideo({ role: 'primary' })} initialGardens={[]} />)
    expect(screen.getByText(/primary source for gardens/i)).toBeInTheDocument()
  })

  it('does not show the primary notifier when the video is not primary', () => {
    render(<SermonDetailClient initialVideo={makeVideo({ role: 'ignored' })} initialGardens={[]} />)
    expect(screen.queryByText(/primary source for gardens/i)).not.toBeInTheDocument()
  })
})




describe('SermonDetailClient — YouTube imports', () => {
  it('shows the "upload the file directly" CTA on a YouTube import in error', () => {
    render(
      <SermonDetailClient
        initialVideo={makeVideo({
          status: 'error',
          youtube_url: 'https://www.youtube.com/watch?v=fake',
          error_message: 'YouTube blocked the download.',
        })}
        initialGardens={[]}
      />
    )
    const link = screen.getByRole('link', { name: /uploading the file directly/i })
    expect(link).toHaveAttribute('href', '/sermons/upload')
  })

  it('does not show the YouTube CTA for non-YouTube errors', () => {
    render(
      <SermonDetailClient
        initialVideo={makeVideo({
          status: 'error',
          youtube_url: null,
          error_message: 'Transcode failed',
        })}
        initialGardens={[]}
      />
    )
    expect(
      screen.queryByRole('link', { name: /uploading the file directly/i }),
    ).not.toBeInTheDocument()
  })

  it('fetches and renders the diagnostics panel for staff viewers', async () => {
    const attempts = [
      makeDownloadAttempt({
        id: 'a1',
        attempt_number: 1,
        outcome: 'failed',
        kind: 'RATE_LIMITED',
        http_status: 429,
        ip_family: 'ipv6',
        egress_ip: '2600::1',
      }),
      makeDownloadAttempt({
        id: 'a2',
        attempt_number: 2,
        outcome: 'succeeded',
        kind: null,
        ip_family: 'ipv4',
        egress_ip: '54.0.0.1',
      }),
    ]
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => attempts,
    })

    render(
      <SermonDetailClient
        initialVideo={makeVideo({
          status: 'ready',
          youtube_url: 'https://youtu.be/x',
        })}
        initialGardens={[]}
        staffViewer
      />,
    )

    await waitFor(() => {
      expect(screen.getByText(/download diagnostics/i)).toBeInTheDocument()
      // Both attempt rows visible after expand. Header is collapsed by
      // default — click to expand.
    })
    fireEvent.click(screen.getByText(/download diagnostics/i))
    await waitFor(() => {
      expect(screen.getByText('RATE_LIMITED')).toBeInTheDocument()
      expect(screen.getByText('429')).toBeInTheDocument()
      expect(screen.getByText('2600::1')).toBeInTheDocument()
    })

    const calledUrls = mockFetch.mock.calls.map(c => c[0])
    expect(calledUrls).toContain('/api/videos/vid-1/download-attempts')
  })

  it('does not render the diagnostics panel for non-staff viewers', () => {
    render(
      <SermonDetailClient
        initialVideo={makeVideo({
          status: 'ready',
          youtube_url: 'https://youtu.be/x',
        })}
        initialGardens={[]}
        staffViewer={false}
      />,
    )
    expect(screen.queryByText(/download diagnostics/i)).not.toBeInTheDocument()
  })

  it('does not render the diagnostics panel on non-YouTube videos', () => {
    render(
      <SermonDetailClient
        initialVideo={makeVideo({ status: 'ready', youtube_url: null })}
        initialGardens={[]}
        staffViewer
      />,
    )
    expect(screen.queryByText(/download diagnostics/i)).not.toBeInTheDocument()
  })
})


describe('SermonDetailClient — stale handling (removed)', () => {
  it('does not show a Stale badge even when gardens are stale', () => {
    render(
      <SermonDetailClient
        initialVideo={makeVideo({ status: 'ready' })}
        initialGardens={[makeGarden({ is_stale: true })]}
      />
    )
    expect(screen.queryByText('Stale')).not.toBeInTheDocument()
  })

  it('does not show Regenerate Gardens button when gardens exist but are stale', () => {
    render(
      <SermonDetailClient
        initialVideo={makeVideo({ status: 'ready' })}
        initialGardens={[makeGarden({ is_stale: true })]}
      />
    )
    expect(screen.queryByRole('button', { name: 'Regenerate Gardens' })).not.toBeInTheDocument()
  })

  it('primary generate flow does not send force', async () => {
    // The manual Generate Gardens form (primary video, custom instructions)
    // should never send force — only the ignored-video override path does.
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [makeGarden({ status: 'generating' })],
    })

    render(
      <SermonDetailClient
        initialVideo={makeVideo({ status: 'ready', role: 'primary' })}
        initialGardens={[]}
      />
    )
    fireEvent.click(screen.getByText('Generate with custom instructions instead'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Generate Gardens' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Generate Gardens' }))

    await waitFor(() => {
      const call = mockFetch.mock.calls.find(
        ([url]) => url === '/api/videos/vid-1/generate-gardens'
      )
      expect(call).toBeDefined()
      const body = JSON.parse(call![1].body)
      expect(body.force).toBeUndefined()
    })
  })
})
