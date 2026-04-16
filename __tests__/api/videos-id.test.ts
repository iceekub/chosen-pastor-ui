vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/api/videos', () => ({ getVideo: vi.fn() }))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { getVideo } from '@/lib/api/videos'
import { GET } from '@/app/api/videos/[id]/route'

const mockGetSession = vi.mocked(getSession)
const mockGetVideo   = vi.mocked(getVideo)

const validSession = { apiToken: 'tok', user: { id: '1' } }

function makeRequest(id: string) {
  return {
    req: new NextRequest(`http://localhost/api/videos/${id}`),
    ctx: { params: Promise.resolve({ id }) },
  }
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/videos/[id]', () => {
  it('returns 401 when there is no session', async () => {
    mockGetSession.mockResolvedValue(null)
    const { req, ctx } = makeRequest('abc-123')
    const res = await GET(req, ctx)
    expect(res.status).toBe(401)
  })

  it('returns the video on success', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockGetVideo.mockResolvedValue({
      id: 'abc-123', title: 'Sunday Sermon', status: 'ready',
      created_at: '2026-01-01T00:00:00Z', video_type: 'sermon',
    })
    const { req, ctx } = makeRequest('abc-123')
    const res = await GET(req, ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('abc-123')
    expect(body.status).toBe('ready')
  })

  it('returns 502 when getVideo throws', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockGetVideo.mockRejectedValue(new Error('Backend down'))
    const { req, ctx } = makeRequest('abc-123')
    const res = await GET(req, ctx)
    expect(res.status).toBe(502)
  })
})
