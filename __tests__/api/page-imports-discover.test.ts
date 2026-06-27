/**
 * POST /api/page-imports/discover — proxies a page scrape to ragserv.
 * getSession gates it; ragserv errors (incl. the 422 fetch failure)
 * surface with their status + message.
 */

vi.mock('server-only', () => ({}))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/api/pageImports', () => ({
  discoverPageVideos: vi.fn(),
  queuePageVideos: vi.fn(),
}))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSession } from '@/lib/session'
import { discoverPageVideos } from '@/lib/api/pageImports'
import { ApiError } from '@/lib/api/client'
import { POST } from '@/app/api/page-imports/discover/route'

const mockSession = getSession as ReturnType<typeof vi.fn>
const mockDiscover = discoverPageVideos as ReturnType<typeof vi.fn>

function call(body: unknown) {
  return POST(
    new Request('http://localhost/api/page-imports/discover', {
      method: 'POST',
      body: JSON.stringify(body),
    }) as never,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSession.mockResolvedValue({ accessToken: 't' })
})

describe('POST /api/page-imports/discover', () => {
  it('401 without a session (never reaches ragserv)', async () => {
    mockSession.mockResolvedValue(null)
    const res = await call({ page_url: 'https://church.test/sermons' })
    expect(res.status).toBe(401)
    expect(mockDiscover).not.toHaveBeenCalled()
  })

  it('400 when page_url is missing', async () => {
    const res = await call({})
    expect(res.status).toBe(400)
    expect(mockDiscover).not.toHaveBeenCalled()
  })

  it('200 delegates and returns the discovery result', async () => {
    const result = { page_url: 'x', found_count: 1, duplicate_count: 0, parse_error_count: 0, videos: [] }
    mockDiscover.mockResolvedValue(result)
    const res = await call({ page_url: 'https://church.test/sermons' })
    expect(res.status).toBe(200)
    expect(mockDiscover).toHaveBeenCalledWith('https://church.test/sermons')
    expect(await res.json()).toEqual(result)
  })

  it('forwards a ragserv ApiError status + message (422 fetch failure)', async () => {
    mockDiscover.mockRejectedValue(new ApiError(422, 'Could not fetch page: blocked'))
    const res = await call({ page_url: 'http://169.254.169.254/' })
    expect(res.status).toBe(422)
    expect((await res.json()).error).toBe('Could not fetch page: blocked')
  })

  it('non-API error → 502', async () => {
    mockDiscover.mockRejectedValue(new Error('network down'))
    const res = await call({ page_url: 'https://church.test/sermons' })
    expect(res.status).toBe(502)
    expect((await res.json()).error).toBe('network down')
  })
})
