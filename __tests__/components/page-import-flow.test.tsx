import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

import { PageImportFlow } from '@/components/page-import/page-import-flow'
import type { DiscoveredPageVideo, PageDiscoverResult } from '@/lib/api/types'

const mockFetch = vi.fn()
beforeEach(() => {
  mockFetch.mockReset()
  vi.stubGlobal('fetch', mockFetch)
})

function makeVideo(overrides: Partial<DiscoveredPageVideo> = {}): DiscoveredPageVideo {
  return {
    platform: 'youtube',
    external_id: 'aaaaaaaaaaa',
    url: 'https://www.youtube.com/watch?v=aaaaaaaaaaa',
    title: 'Easter Service',
    already_imported: false,
    ...overrides,
  }
}

const DISCOVER_RESULT: PageDiscoverResult = {
  page_url: 'https://church.test/sermons',
  found_count: 3,
  duplicate_count: 1,
  parse_error_count: 0,
  videos: [
    makeVideo(),
    makeVideo({ platform: 'vimeo', external_id: '123', url: 'https://vimeo.com/123', title: null }),
    makeVideo({ external_id: 'bbbbbbbbbbb', url: 'https://www.youtube.com/watch?v=bbbbbbbbbbb', title: 'Old', already_imported: true }),
  ],
}

function discoverResolves(result: PageDiscoverResult = DISCOVER_RESULT) {
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => result })
}

async function runDiscover() {
  render(<PageImportFlow />)
  fireEvent.change(screen.getByPlaceholderText(/therockmontana/i), {
    target: { value: 'https://church.test/sermons' },
  })
  fireEvent.click(screen.getByRole('button', { name: /find videos/i }))
}

describe('<PageImportFlow />', () => {
  it('disables "Find videos" until a plausible URL is entered', () => {
    render(<PageImportFlow />)
    const submit = screen.getByRole('button', { name: /find videos/i })
    expect(submit).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText(/therockmontana/i), {
      target: { value: 'church.test/sermons' },
    })
    expect(submit).not.toBeDisabled()
  })

  it('renders discovered videos with platform badges; already-imported is disabled', async () => {
    discoverResolves()
    await runDiscover()

    await waitFor(() => expect(screen.getByText('Easter Service')).toBeInTheDocument())
    expect(screen.getAllByText('YouTube')).toHaveLength(2) // two YouTube videos
    expect(screen.getByText('Vimeo')).toBeInTheDocument()
    expect(screen.getByText('Already imported')).toBeInTheDocument()

    // The already-imported row's checkbox is disabled.
    const dupCheckbox = screen.getByLabelText('Old') as HTMLInputElement
    expect(dupCheckbox).toBeDisabled()

    // Discover hit the right endpoint with the normalized URL.
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/page-imports/discover')
    expect(JSON.parse(init.body as string).page_url).toBe('https://church.test/sermons')
  })

  it('pre-selects non-duplicates and queues exactly those URLs', async () => {
    discoverResolves()
    await runDiscover()
    await waitFor(() => expect(screen.getByText('Easter Service')).toBeInTheDocument())

    // Two selectable (non-dup) videos pre-selected.
    const queueBtn = screen.getByRole('button', { name: /queue 2 videos/i })
    expect(queueBtn).not.toBeDisabled()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ queued_count: 2, skipped_duplicate_count: 0, invalid_count: 0, results: [] }),
    })
    fireEvent.click(queueBtn)

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
    const [url, init] = mockFetch.mock.calls[1]
    expect(url).toBe('/api/page-imports/queue')
    const body = JSON.parse(init.body as string)
    expect(body.video_urls).toEqual([
      'https://www.youtube.com/watch?v=aaaaaaaaaaa',
      'https://vimeo.com/123',
    ])
    // The already-imported video is NOT queued.
    expect(body.video_urls).not.toContain('https://www.youtube.com/watch?v=bbbbbbbbbbb')

    await waitFor(() => expect(screen.getByText(/Queued 2 videos/i)).toBeInTheDocument())
    expect(screen.getByRole('link', { name: /Track on Downloads/i })).toHaveAttribute('href', '/downloads')
  })

  it('Clear empties the selection and disables Queue', async () => {
    discoverResolves()
    await runDiscover()
    await waitFor(() => expect(screen.getByText('Easter Service')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /^clear$/i }))
    expect(screen.getByRole('button', { name: /queue 0 videos/i })).toBeDisabled()
  })

  it('shows an empty state when no videos are found', async () => {
    discoverResolves({ page_url: 'https://church.test', found_count: 0, duplicate_count: 0, parse_error_count: 2, videos: [] })
    await runDiscover()
    await waitFor(() => expect(screen.getByText(/No videos found/i)).toBeInTheDocument())
  })

  it('surfaces a discover error inline', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ error: 'Could not fetch page: timeout' }),
    })
    await runDiscover()
    await waitFor(() => expect(screen.getByText(/Could not fetch page: timeout/i)).toBeInTheDocument())
  })
})
