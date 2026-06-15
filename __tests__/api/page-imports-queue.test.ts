/**
 * POST /api/page-imports/queue — proxies the selected video URLs to
 * ragserv for create + dispatch. getSession gates it.
 */

vi.mock('server-only', () => ({}))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/api/pageImports', () => ({
  discoverPageVideos: vi.fn(),
  queuePageVideos: vi.fn(),
}))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSession } from '@/lib/session'
import { queuePageVideos } from '@/lib/api/pageImports'
import { ApiError } from '@/lib/api/client'
import { POST } from '@/app/api/page-imports/queue/route'

const mockSession = getSession as ReturnType<typeof vi.fn>
const mockQueue = queuePageVideos as ReturnType<typeof vi.fn>

function call(body: unknown) {
  return POST(
    new Request('http://localhost/api/page-imports/queue', {
      method: 'POST',
      body: JSON.stringify(body),
    }) as never,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSession.mockResolvedValue({ accessToken: 't' })
})

describe('POST /api/page-imports/queue', () => {
  it('401 without a session', async () => {
    mockSession.mockResolvedValue(null)
    const res = await call({ video_urls: ['https://youtu.be/aaaaaaaaaaa'] })
    expect(res.status).toBe(401)
    expect(mockQueue).not.toHaveBeenCalled()
  })

  it('400 when video_urls is empty or not an array', async () => {
    expect((await call({ video_urls: [] })).status).toBe(400)
    expect((await call({})).status).toBe(400)
    expect(mockQueue).not.toHaveBeenCalled()
  })

  it('200 delegates the URLs (and page_url) to ragserv', async () => {
    const result = { queued_count: 1, skipped_duplicate_count: 0, invalid_count: 0, results: [] }
    mockQueue.mockResolvedValue(result)
    const res = await call({
      video_urls: ['https://youtu.be/aaaaaaaaaaa'],
      page_url: 'https://church.test/sermons',
    })
    expect(res.status).toBe(200)
    expect(mockQueue).toHaveBeenCalledWith(
      ['https://youtu.be/aaaaaaaaaaa'],
      'https://church.test/sermons',
    )
    expect(await res.json()).toEqual(result)
  })

  it('forwards a ragserv ApiError', async () => {
    mockQueue.mockRejectedValue(new ApiError(403, 'Page import is staff-only'))
    const res = await call({ video_urls: ['https://youtu.be/aaaaaaaaaaa'] })
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('Page import is staff-only')
  })

  it('non-API error → 502', async () => {
    mockQueue.mockRejectedValue(new Error('boom'))
    const res = await call({ video_urls: ['https://youtu.be/aaaaaaaaaaa'] })
    expect(res.status).toBe(502)
  })
})
