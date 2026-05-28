vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/api/videos', () => ({ createYouTubeVideo: vi.fn() }))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { createYouTubeVideo } from '@/lib/api/videos'
import { POST } from '@/app/api/videos/youtube/route'

const mockGetSession = getSession as ReturnType<typeof vi.fn>
const mockCreate = createYouTubeVideo as ReturnType<typeof vi.fn>

const validSession = {
  accessToken: 'access-token-test',
  refreshToken: 'refresh-token-test',
  user: {
    id: '1',
    name: 'Test',
    email: 't@t',
    role: 'pastor' as const,
    church_id: 'c1',
    church_name: 'Demo',
  },
}

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/videos/youtube', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/videos/youtube', () => {
  it('returns 401 with no session', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await POST(
      makeRequest({ youtube_url: 'https://youtu.be/x' }),
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 when youtube_url is missing', async () => {
    mockGetSession.mockResolvedValue(validSession)
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('forwards to ragserv and returns video_id on success', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockCreate.mockResolvedValue({
      id: 'vid-xyz',
      status: 'downloading',
      title: 'Real title',
      role: 'ignored',
      video_date: '2026-05-17',
    } as never)

    const res = await POST(
      makeRequest({
        youtube_url: 'https://youtu.be/x',
        title: 'Override Title',
        video_date: '2026-05-17',
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ video_id: 'vid-xyz', status: 'downloading' })

    // church_id forwarded from verifySession so super_admin uploads land in the right church.
    expect(mockCreate).toHaveBeenCalledWith(
      'https://youtu.be/x',
      'Override Title',
      '2026-05-17',
      undefined,
      'c1',
    )
  })

  it('returns 502 on ragserv error', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockCreate.mockRejectedValue(new Error('ragserv: 500'))
    const res = await POST(
      makeRequest({ youtube_url: 'https://youtu.be/x' }),
    )
    expect(res.status).toBe(502)
  })
})
