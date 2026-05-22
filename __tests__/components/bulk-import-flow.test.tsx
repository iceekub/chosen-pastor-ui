import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

import { BulkImportFlow } from '@/components/bulk-import/flow'
import type {
  BulkImportJobDetail,
  BulkImportJobItem,
} from '@/lib/api/types'

const mockFetch = vi.fn()
beforeEach(() => {
  mockFetch.mockReset()
  vi.stubGlobal('fetch', mockFetch)
})

function makeItem(overrides: Partial<BulkImportJobItem> = {}): BulkImportJobItem {
  return {
    id: 'item-1',
    job_id: 'job-1',
    position: 0,
    youtube_video_id: 'aaaaaaaaaa1',
    youtube_url: 'https://www.youtube.com/watch?v=aaaaaaaaaa1',
    title: 'Service One',
    duration_seconds: 4500,
    upload_date: '2026-05-03',
    week_anchor_sunday: '2026-05-03',
    is_recommended: true,
    is_selected: true,
    assigned_ip_family: null,
    outcome: 'pending',
    video_id: null,
    existing_video_id: null,
    failure_kind: null,
    failure_message: null,
    started_at: null,
    finished_at: null,
    ...overrides,
  }
}

function makeJob(overrides: Partial<BulkImportJobDetail> = {}): BulkImportJobDetail {
  return {
    id: 'job-1',
    church_id: 'church-1',
    created_by: 'prof-1',
    channel_url: '@TestChurch',
    normalized_channel_url: 'https://www.youtube.com/@TestChurch/videos',
    requested_count: 25,
    fetch_multiplier: 4,
    pacing_seconds: 60,
    consecutive_failure_threshold: 3,
    automatic: false,
    force: false,
    status: 'awaiting_review',
    discovery_error: null,
    consecutive_failures: 0,
    created_at: '2026-05-17T00:00:00Z',
    updated_at: '2026-05-17T00:00:00Z',
    items: [],
    ...overrides,
  }
}


describe('<BulkImportFlow /> phase shims', () => {
  it('shows the "scanning" banner while status=discovering', () => {
    render(<BulkImportFlow initialJob={makeJob({ status: 'discovering' })} />)
    expect(screen.getByText(/Scanning channel/i)).toBeInTheDocument()
  })

  it('shows the failure banner with the discovery_error message', () => {
    render(
      <BulkImportFlow
        initialJob={makeJob({
          status: 'discovery_failed',
          discovery_error: 'channel does not exist',
        })}
      />,
    )
    expect(screen.getByText(/Couldn't scan that channel/i)).toBeInTheDocument()
    expect(screen.getByText(/channel does not exist/i)).toBeInTheDocument()
  })
})


describe('<BulkImportFlow /> review (phase 2)', () => {
  it('renders selectable rows and disables already-imported ones', () => {
    const job = makeJob({
      status: 'awaiting_review',
      items: [
        makeItem({ id: 'a', title: 'Live A' }),
        makeItem({
          id: 'b',
          title: 'Already Have',
          is_selected: false,
          outcome: 'skipped_duplicate',
          existing_video_id: 'vid-existing',
        }),
        makeItem({
          id: 'c',
          title: 'Older one',
          is_recommended: false,
          is_selected: false,
        }),
      ],
    })
    render(<BulkImportFlow initialJob={job} />)

    const checkboxes = screen.getAllByRole('checkbox')
    // 3 rows: 1 pre-checked (a), 1 duplicate disabled, 1 unchecked pending.
    expect(checkboxes).toHaveLength(3)
    expect(checkboxes[0]).toBeChecked()
    expect(checkboxes[1]).toBeDisabled()
    expect(checkboxes[2]).not.toBeChecked()

    expect(screen.getByText(/Already imported/i)).toBeInTheDocument()
  })

  it('Start posts the selected ids and updates job status', async () => {
    const job = makeJob({
      status: 'awaiting_review',
      items: [
        makeItem({ id: 'a', title: 'A' }),
        makeItem({ id: 'b', title: 'B', is_selected: false, is_recommended: false }),
      ],
    })
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ...job, items: undefined, status: 'queued' }),
    })

    render(<BulkImportFlow initialJob={job} />)

    // Add b to the selection.
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1])

    fireEvent.click(screen.getByRole('button', { name: /Start 2 downloads/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/bulk-imports/job-1/start')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body as string)
    expect(body.selected_item_ids.sort()).toEqual(['a', 'b'])

    // After start the progress view renders.
    await waitFor(() => {
      expect(screen.getByText(/queued|running/i)).toBeInTheDocument()
    })
  })

  it('"Select all recommended" snaps selection to recommended items', () => {
    const job = makeJob({
      items: [
        makeItem({ id: 'a', is_recommended: true, is_selected: false }),
        makeItem({ id: 'b', is_recommended: false, is_selected: false }),
        makeItem({ id: 'c', is_recommended: true, is_selected: false }),
      ],
    })
    render(<BulkImportFlow initialJob={job} />)

    fireEvent.click(
      screen.getByRole('button', { name: /Select all recommended/i }),
    )

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
    expect(checkboxes[0].checked).toBe(true)
    expect(checkboxes[1].checked).toBe(false)
    expect(checkboxes[2].checked).toBe(true)
  })
})


describe('<BulkImportFlow /> progress (phase 3)', () => {
  it('renders the progress bar with per-outcome counts', () => {
    const job = makeJob({
      status: 'running',
      items: [
        makeItem({ id: 'a', outcome: 'completed', is_selected: true }),
        makeItem({ id: 'b', outcome: 'failed', is_selected: true, failure_kind: 'AUTH_REQUIRED' }),
        makeItem({ id: 'c', outcome: 'running', is_selected: true }),
        makeItem({ id: 'd', outcome: 'pending', is_selected: true }),
      ],
    })
    render(<BulkImportFlow initialJob={job} />)

    expect(screen.getByText(/1 succeeded/i)).toBeInTheDocument()
    expect(screen.getByText(/1 failed/i)).toBeInTheDocument()
    // 'running' + 'pending' = 2 remaining
    expect(screen.getByText(/2 remaining/i)).toBeInTheDocument()
    expect(screen.getByText(/AUTH_REQUIRED/)).toBeInTheDocument()
  })

  it('Stop button confirms then POSTs to /stop', async () => {
    const job = makeJob({
      status: 'running',
      items: [
        makeItem({ id: 'a', outcome: 'running', is_selected: true }),
        makeItem({ id: 'b', outcome: 'pending', is_selected: true }),
      ],
    })
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ...job, status: 'stopped' }),
    })

    render(<BulkImportFlow initialJob={job} />)
    fireEvent.click(screen.getByRole('button', { name: /^Stop$/ }))

    expect(confirmSpy).toHaveBeenCalled()
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/bulk-imports/job-1/stop')
    expect(init.method).toBe('POST')
    confirmSpy.mockRestore()
  })

  it('hides Stop on terminal status', () => {
    render(
      <BulkImportFlow
        initialJob={makeJob({ status: 'completed', items: [makeItem()] })}
      />,
    )
    expect(screen.queryByRole('button', { name: /^Stop$/ })).toBeNull()
  })

  it('links a completed item to its sermon detail page', () => {
    const job = makeJob({
      status: 'completed',
      items: [
        makeItem({
          id: 'a',
          outcome: 'completed',
          video_id: 'vid-aaa',
          title: 'Sunday Sermon',
        }),
      ],
    })
    render(<BulkImportFlow initialJob={job} />)
    const link = screen.getByRole('link', { name: /Sunday Sermon/ }) as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/sermons/vid-aaa')
  })
})
