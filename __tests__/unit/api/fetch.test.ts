/**
 * lib/api/fetch.ts — exact wire paths. The select strings double as the
 * contract with PostgREST embeds (device names via RLS-nulled joins),
 * so they're pinned verbatim-ish here.
 */

vi.mock('server-only', () => ({}))
vi.mock('@/lib/api/client', () => ({
  postgrest: vi.fn(),
  ragserv: vi.fn(),
}))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { postgrest, ragserv } from '@/lib/api/client'
import {
  cancelFetchJob,
  disableFetchDevice,
  enableFetchDevice,
  getActiveDownloads,
  getFetchDevices,
  getRecentDeviceFailures,
  getRecentDownloadHistory,
  retryFetchJob,
} from '@/lib/api/fetch'

const mockPostgrest = postgrest as ReturnType<typeof vi.fn>
const mockRagserv = ragserv as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  mockPostgrest.mockResolvedValue([])
  mockRagserv.mockResolvedValue({})
})

describe('Downloads spine queries', () => {
  it('active query filters to downloading youtube videos, scoped to church', async () => {
    await getActiveDownloads('church-1')
    const path = mockPostgrest.mock.calls[0][0] as string
    expect(path).toContain('/videos?status=eq.downloading')
    expect(path).toContain('youtube_url=not.is.null')
    expect(path).toContain('church_id=eq.church-1')
    expect(path).toContain('device:device_id(name)')
    expect(path).toContain('claimed_device:claimed_by_device_id(name)')
    expect(path).toContain('bulk_item:bulk_import_item_id(job_id)')
    expect(path).toContain('progress')
    expect(path).toContain('video_download_attempts.order=attempt_number.asc')
    expect(path).toContain('order=created_at.desc')
  })

  it('active query omits the church filter for global super_admin view', async () => {
    await getActiveDownloads(null)
    const path = mockPostgrest.mock.calls[0][0] as string
    expect(path).not.toContain('church_id=eq.')
    expect(path).toContain('churches(name)')
  })

  it('history query windows on updated_at over post-download statuses', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-12T00:00:00.000Z'))
    try {
      await getRecentDownloadHistory('church-1', 7)
    } finally {
      vi.useRealTimers()
    }
    const path = mockPostgrest.mock.calls[0][0] as string
    expect(path).toContain(
      'status=in.(transcoding,transcode_failed,uploaded,processing,ready,error)',
    )
    expect(path).toContain(
      `updated_at=gte.${encodeURIComponent('2026-06-05T00:00:00.000Z')}`,
    )
    expect(path).toContain('limit=100')
    expect(path).toContain('order=updated_at.desc')
  })
})

describe('Fleet queries', () => {
  it('lists devices by name', async () => {
    await getFetchDevices()
    expect(mockPostgrest).toHaveBeenCalledWith('/fetch_devices?select=*&order=name.asc')
  })

  it('pulls recent failed device attempts with the video embedded', async () => {
    await getRecentDeviceFailures(7)
    const path = mockPostgrest.mock.calls[0][0] as string
    expect(path).toContain('/video_download_attempts?device_id=not.is.null')
    expect(path).toContain('outcome=eq.failed')
    expect(path).toContain('started_at=gte.')
    expect(path).toContain('video:videos(id,title)')
    expect(path).toContain('limit=500')
  })
})

describe('ragserv writes', () => {
  it.each([
    [enableFetchDevice, '/fetch/devices/d-1/enable'],
    [disableFetchDevice, '/fetch/devices/d-1/disable'],
    [retryFetchJob, '/fetch/jobs/d-1/retry'],
    [cancelFetchJob, '/fetch/jobs/d-1/cancel'],
  ] as const)('POSTs to the right ragserv path', async (fn, path) => {
    await fn('d-1')
    expect(mockRagserv).toHaveBeenCalledWith(path, { method: 'POST' })
  })
})
