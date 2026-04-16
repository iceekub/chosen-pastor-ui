vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/api/garden', () => ({ updateGarden: vi.fn() }))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { updateGarden } from '@/lib/api/garden'
import { PUT } from '@/app/api/gardens/[id]/route'

const mockGetSession   = vi.mocked(getSession)
const mockUpdateGarden = vi.mocked(updateGarden)

const validSession = { apiToken: 'tok', user: { id: '1' } }

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
    const { req, ctx } = makeRequest('g1', { content_markdown: '# Hello' })
    const res = await PUT(req, ctx)
    expect(res.status).toBe(401)
  })

  it('returns the updated garden on success', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockUpdateGarden.mockResolvedValue({
      id: 'g1', video_id: 'v1', content_markdown: '# Updated', status: 'ready',
      day_number: 1, created_at: '2026-01-01',
    })
    const { req, ctx } = makeRequest('g1', { content_markdown: '# Updated' })
    const res = await PUT(req, ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.content_markdown).toBe('# Updated')
  })

  it('passes the full body to updateGarden', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockUpdateGarden.mockResolvedValue({ id: 'g1' } as never)
    const payload = { content_markdown: '# New content', topic: 'Grace' }
    const { req, ctx } = makeRequest('g1', payload)
    await PUT(req, ctx)
    expect(mockUpdateGarden).toHaveBeenCalledWith('g1', payload)
  })

  it('returns 502 when updateGarden throws', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockUpdateGarden.mockRejectedValue(new Error('Backend down'))
    const { req, ctx } = makeRequest('g1', { content_markdown: '# Hi' })
    const res = await PUT(req, ctx)
    expect(res.status).toBe(502)
  })
})
