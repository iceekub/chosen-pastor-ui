vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/api/videos', () => ({
  deleteVideo: vi.fn(),
  getVideo: vi.fn(),
  setVideoRole: vi.fn(),
}))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { deleteVideo } from '@/lib/api/videos'
import { ApiError } from '@/lib/api/client'
import { DELETE } from '@/app/api/videos/[id]/route'

const mockGetSession = vi.mocked(getSession)
const mockDelete = vi.mocked(deleteVideo)

const validSession = { accessToken: 'a', refreshToken: 'r', user: { id: '1', name: 'T', email: 't@t', role: 'pastor' as const, church_id: 'c1', church_name: 'Demo' } }

function makeRequest(id: string) {
  return {
    req: new NextRequest(`http://localhost/api/videos/${id}`, { method: 'DELETE' }),
    ctx: { params: Promise.resolve({ id }) },
  }
}

beforeEach(() => vi.clearAllMocks())

describe('DELETE /api/videos/[id]', () => {
  it('returns 401 without a session', async () => {
    mockGetSession.mockResolvedValue(null)
    const { req, ctx } = makeRequest('v1')
    expect((await DELETE(req, ctx)).status).toBe(401)
  })

  it('returns 204 on success', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockDelete.mockResolvedValue(undefined)
    const { req, ctx } = makeRequest('v1')
    const res = await DELETE(req, ctx)
    expect(res.status).toBe(204)
    expect(mockDelete).toHaveBeenCalledWith('v1')
  })

  it('forwards a 409 from ragserv (published video not deletable)', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockDelete.mockRejectedValue(new ApiError(409, 'not_deletable'))
    const { req, ctx } = makeRequest('v1')
    expect((await DELETE(req, ctx)).status).toBe(409)
  })

  it('returns 502 on an unexpected error', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockDelete.mockRejectedValue(new Error('boom'))
    const { req, ctx } = makeRequest('v1')
    expect((await DELETE(req, ctx)).status).toBe(502)
  })
})
