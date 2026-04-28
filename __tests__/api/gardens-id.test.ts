vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import type { Session } from '@/lib/session'
import { PUT } from '@/app/api/gardens/[id]/route'

const mockGetSession = vi.mocked(getSession)

const validSession = { apiToken: 'tok', user: { id: '1' } } as unknown as Session

function makeRequest(id: string, body: object) {
  return {
    req: new NextRequest(`http://localhost/api/gardens/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    ctx: { params: Promise.resolve({ id }) },
  }
}

beforeEach(() => vi.clearAllMocks())

describe('PUT /api/gardens/[id]', () => {
  it('returns 401 when there is no session', async () => {
    mockGetSession.mockResolvedValue(null)
    const { req, ctx } = makeRequest('g1', { topic: 'Grace' })
    const res = await PUT(req, ctx)
    expect(res.status).toBe(401)
  })

  it('returns 501 when authenticated (endpoint not yet implemented)', async () => {
    mockGetSession.mockResolvedValue(validSession)
    const { req, ctx } = makeRequest('g1', { topic: 'Grace' })
    const res = await PUT(req, ctx)
    expect(res.status).toBe(501)
    const body = await res.json()
    expect(body.error).toMatch(/not yet supported/i)
  })
})
