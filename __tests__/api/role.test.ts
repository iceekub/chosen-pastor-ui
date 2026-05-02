vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/api/videos', () => ({ setVideoRole: vi.fn() }))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { setVideoRole } from '@/lib/api/videos'
import { PATCH } from '@/app/api/videos/[id]/role/route'

const mockGetSession = vi.mocked(getSession)
const mockSetRole = vi.mocked(setVideoRole)

const validSession = { accessToken: 'access-token-test', refreshToken: 'refresh-token-test', user: { id: '1', name: 'Test', email: 't@t', role: 'pastor' as const, church_id: 'c1', church_name: 'Demo' } }

function makePatch(id: string, body?: object) {
  return {
    req: new NextRequest(`http://localhost/api/videos/${id}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    }),
    ctx: { params: Promise.resolve({ id }) },
  }
}

beforeEach(() => vi.clearAllMocks())

describe('PATCH /api/videos/[id]/role', () => {
  it('returns 401 when there is no session', async () => {
    mockGetSession.mockResolvedValue(null)
    const { req, ctx } = makePatch('vid-1', { role: 'primary' })
    const res = await PATCH(req, ctx)
    expect(res.status).toBe(401)
    expect(mockSetRole).not.toHaveBeenCalled()
  })

  it('forwards role + video_date to the backend on success', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockSetRole.mockResolvedValue({ id: 'vid-1', role: 'primary' } as never)

    const { req, ctx } = makePatch('vid-1', {
      role: 'primary',
      video_date: '2026-04-26',
    })
    const res = await PATCH(req, ctx)
    expect(res.status).toBe(200)
    expect(mockSetRole).toHaveBeenCalledWith('vid-1', 'primary', '2026-04-26')
  })

  it('rejects an invalid role value with 400 before hitting backend', async () => {
    mockGetSession.mockResolvedValue(validSession)
    const { req, ctx } = makePatch('vid-1', { role: 'bogus' })
    const res = await PATCH(req, ctx)
    expect(res.status).toBe(400)
    expect(mockSetRole).not.toHaveBeenCalled()
  })

  it('passes only video_date when role is omitted (date-only updates allowed)', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockSetRole.mockResolvedValue({ id: 'vid-1' } as never)

    const { req, ctx } = makePatch('vid-1', { video_date: '2026-04-29' })
    await PATCH(req, ctx)

    expect(mockSetRole).toHaveBeenCalledWith('vid-1', undefined, '2026-04-29')
  })

  it('returns 502 when the backend errors (eg primary collision)', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockSetRole.mockRejectedValue(
      new Error('Another primary already exists for this week.')
    )

    const { req, ctx } = makePatch('vid-1', { role: 'primary' })
    const res = await PATCH(req, ctx)
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toContain('Another primary already exists')
  })
})
