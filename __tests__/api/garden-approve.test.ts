vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/api/garden', () => ({ approveGarden: vi.fn() }))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { approveGarden } from '@/lib/api/garden'
import { POST } from '@/app/api/garden/[id]/approve/route'

const mockGetSession = getSession as ReturnType<typeof vi.fn>
const mockApprove = approveGarden as ReturnType<typeof vi.fn>

const validSession = { apiToken: 'tok', user: { id: 1 } }

function makeRequest(id: string) {
  return {
    req: new NextRequest('http://localhost/api/garden/approve'),
    ctx: { params: Promise.resolve({ id }) },
  }
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/garden/[id]/approve', () => {
  it('returns 401 when there is no session', async () => {
    mockGetSession.mockResolvedValue(null)
    const { req, ctx } = makeRequest('5')
    const res = await POST(req, ctx)
    expect(res.status).toBe(401)
  })

  it('returns the approved garden on success', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockApprove.mockResolvedValue({ id: 5, status: 'approved' })

    const { req, ctx } = makeRequest('5')
    const res = await POST(req, ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('approved')
  })

  it('returns 502 when approveGarden throws (non-dev)', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockApprove.mockRejectedValue(new Error('Backend error'))

    const { req, ctx } = makeRequest('5')
    const res = await POST(req, ctx)
    expect(res.status).toBe(502)
  })
})
