vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

const mockAddNotification = vi.fn()
vi.mock('@/lib/notifications', () => ({
  useNotifications: () => ({ addNotification: mockAddNotification }),
}))

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SermonDetailClient } from '@/components/sermon-detail-client'
import {
  makeVideo as makeVideoBase,
  makeGardenListItem,
} from '../factories'

// Reset fetch mock between tests
const mockFetch = vi.fn()
beforeEach(() => {
  mockFetch.mockReset()
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
  it('shows generate button when ready and no gardens', () => {
    render(<SermonDetailClient initialVideo={makeVideo({ status: 'ready' })} initialGardens={[]} />)
    expect(screen.getByRole('button', { name: 'Generate Gardens' })).toBeInTheDocument()
  })

  it('does not show generate button when gardens already exist', () => {
    render(
      <SermonDetailClient
        initialVideo={makeVideo({ status: 'ready' })}
        initialGardens={[makeGarden()]}
      />
    )
    expect(screen.queryByText('Generate Gardens')).not.toBeInTheDocument()
  })

  it('does not show generate button when video is not ready', () => {
    render(<SermonDetailClient initialVideo={makeVideo({ status: 'processing' })} initialGardens={[]} />)
    expect(screen.queryByText('Generate Gardens')).not.toBeInTheDocument()
  })

  it('shows generating state and calls fetch on click', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [makeGarden({ status: 'generating' })],
    })

    render(<SermonDetailClient initialVideo={makeVideo({ status: 'ready' })} initialGardens={[]} />)
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

    render(<SermonDetailClient initialVideo={makeVideo({ status: 'ready' })} initialGardens={[]} />)
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

    render(<SermonDetailClient initialVideo={makeVideo({ status: 'ready' })} initialGardens={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Generate Gardens' }))

    await waitFor(() => {
      expect(screen.getByText('Backend unavailable')).toBeInTheDocument()
    })
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
    expect(screen.getByText(/being used to generate this week/i)).toBeInTheDocument()
  })

  it('does not show the primary notifier when the video is not primary', () => {
    render(<SermonDetailClient initialVideo={makeVideo({ role: 'ignored' })} initialGardens={[]} />)
    expect(screen.queryByText(/being used to generate this week/i)).not.toBeInTheDocument()
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

  it('placeholder that previously tested force=true', async () => {
    // force=true regeneration was removed alongside the Stale UI.
    // The generate flow no longer sends force at all.
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
