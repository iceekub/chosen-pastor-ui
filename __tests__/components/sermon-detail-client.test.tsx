vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { SermonDetailClient } from '@/components/sermon-detail-client'
import { makeVideo as makeVideoBase, makeGardenListItem } from '../factories'

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
  it('renders the video title', () => {
    render(<SermonDetailClient initialVideo={makeVideo()} initialGardens={[]} />)
    expect(screen.getByText('Sunday Sermon')).toBeInTheDocument()
  })

  it('renders the Ready status badge', () => {
    render(<SermonDetailClient initialVideo={makeVideo({ status: 'ready' })} initialGardens={[]} />)
    expect(screen.getByText('Ready')).toBeInTheDocument()
  })

  it('renders the Processing status badge when processing', () => {
    render(<SermonDetailClient initialVideo={makeVideo({ status: 'processing' })} initialGardens={[]} />)
    expect(screen.getByText('Processing')).toBeInTheDocument()
  })

  it('renders video description when present', () => {
    render(<SermonDetailClient initialVideo={makeVideo({ description: 'A great sermon' })} initialGardens={[]} />)
    expect(screen.getByText('A great sermon')).toBeInTheDocument()
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
  it('does not show transcript toggle when no transcript', () => {
    render(<SermonDetailClient initialVideo={makeVideo({ status: 'ready' })} initialGardens={[]} />)
    expect(screen.queryByText('Transcript')).not.toBeInTheDocument()
  })

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
  it('renders garden cards with day names', () => {
    const gardens = [
      makeGarden({ id: 'g1', day_number: 1, topic: 'Faith' }),
      makeGarden({ id: 'g2', day_number: 2, topic: 'Hope' }),
    ]
    render(<SermonDetailClient initialVideo={makeVideo({ status: 'ready' })} initialGardens={gardens} />)
    expect(screen.getByText('Day 1 — Monday')).toBeInTheDocument()
    expect(screen.getByText('Day 2 — Tuesday')).toBeInTheDocument()
    expect(screen.getByText('Faith')).toBeInTheDocument()
    expect(screen.getByText('Hope')).toBeInTheDocument()
  })

  it('links each garden to /garden/{id}', () => {
    render(
      <SermonDetailClient
        initialVideo={makeVideo({ status: 'ready' })}
        initialGardens={[makeGarden({ id: 'g1' })]}
      />
    )
    expect(screen.getByRole('link', { name: /Day 1/i })).toHaveAttribute('href', '/garden/g1')
  })

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
