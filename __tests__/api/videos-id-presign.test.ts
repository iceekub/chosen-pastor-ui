vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/api/videos', () => ({ reissueUploadUrl: vi.fn() }))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { reissueUploadUrl } from '@/lib/api/videos'
import { ApiError } from '@/lib/api/client'
import { POST } from '@/app/api/videos/[id]/presign/route'

const mockGetSession = vi.mocked(getSession)
const mockReissue = vi.mocked(reissueUploadUrl)

const validSession = { accessToken: 'a', refreshToken: 'r', user: { id: '1', name: 'T', email: 't@t', role: 'pastor' as const, church_id: 'c1', church_name: 'Demo' } }

function makeRequest(id: string, body: Record<string, unknown> = {}) {
  return {
    req: new NextRequest(`http://localhost/api/videos/${id}/presign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    ctx: { params: Promise.resolve({ id }) },
  }
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/videos/[id]/presign', () => {
  it('returns 401 without a session', async () => {
    mockGetSession.mockResolvedValue(null)
    const { req, ctx } = makeRequest('v1')
    expect((await POST(req, ctx)).status).toBe(401)
  })

  it('returns a fresh URL for the SAME video on success', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockReissue.mockResolvedValue({
      id: 'v1', presigned_upload_url: 'https://s3/again', video_date: '2026-04-27', role: 'ignored',
    } as never)
    const { req, ctx } = makeRequest('v1', { content_type: 'video/mp4' })
    const res = await POST(req, ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.video_id).toBe('v1') // same row, not a new one
    expect(body.presigned_upload_url).toBe('https://s3/again')
    expect(mockReissue).toHaveBeenCalledWith('v1', 'video/mp4')
  })

  it('forwards a 409 from ragserv (e.g. already processing)', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockReissue.mockRejectedValue(new ApiError(409, 'not_pending_upload'))
    const { req, ctx } = makeRequest('v1')
    expect((await POST(req, ctx)).status).toBe(409)
  })

  it("extracts ragserv's structured error code for the client", async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockReissue.mockRejectedValue(
      new ApiError(
        409,
        JSON.stringify({ detail: { code: 'not_pending_upload', message: 'already processing' } }),
      ),
    )
    const { req, ctx } = makeRequest('v1')
    const res = await POST(req, ctx)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('not_pending_upload')
    expect(body.error).toBe('already processing')
  })

  it('returns 502 on an unexpected error', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockReissue.mockRejectedValue(new Error('boom'))
    const { req, ctx } = makeRequest('v1')
    expect((await POST(req, ctx)).status).toBe(502)
  })
})
