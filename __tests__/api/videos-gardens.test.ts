vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/api/videos', () => ({ getVideoGardens: vi.fn(), generateGardens: vi.fn() }))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { getVideoGardens, generateGardens } from '@/lib/api/videos'
import { GET } from '@/app/api/videos/[id]/gardens/route'
import { POST } from '@/app/api/videos/[id]/generate-gardens/route'

const mockGetSession      = vi.mocked(getSession)
const mockGetGardens      = vi.mocked(getVideoGardens)
const mockGenerateGardens = vi.mocked(generateGardens)

const validSession = { accessToken: 'access-token-test', refreshToken: 'refresh-token-test', user: { id: '1', name: 'Test', email: 't@t', role: 'pastor' as const, church_id: 'c1', church_name: 'Demo' } }

function makeGetRequest(id: string) {
  return {
    req: new NextRequest(`http://localhost/api/videos/${id}/gardens`),
    ctx: { params: Promise.resolve({ id }) },
  }
}

function makePostRequest(id: string, body?: object) {
  return {
    req: new NextRequest(`http://localhost/api/videos/${id}/generate-gardens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    }),
    ctx: { params: Promise.resolve({ id }) },
  }
}

const fakeGardens = [
  { id: 'g1', video_id: 'abc', day_number: 1, topic: 'Faith', status: 'ready' as const, created_at: '2026-01-01' },
  { id: 'g2', video_id: 'abc', day_number: 2, topic: 'Hope',  status: 'ready' as const, created_at: '2026-01-01' },
] as never

beforeEach(() => vi.clearAllMocks())

describe('GET /api/videos/[id]/gardens', () => {
  it('returns 401 when there is no session', async () => {
    mockGetSession.mockResolvedValue(null)
    const { req, ctx } = makeGetRequest('abc')
    const res = await GET(req, ctx)
    expect(res.status).toBe(401)
  })

  it('returns the garden list on success', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockGetGardens.mockResolvedValue(fakeGardens)
    const { req, ctx } = makeGetRequest('abc')
    const res = await GET(req, ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(2)
    expect(body[0].topic).toBe('Faith')
  })

  it('returns 502 when getVideoGardens throws', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockGetGardens.mockRejectedValue(new Error('Backend down'))
    const { req, ctx } = makeGetRequest('abc')
    const res = await GET(req, ctx)
    expect(res.status).toBe(502)
  })
})

describe('POST /api/videos/[id]/generate-gardens', () => {
  it('returns 401 when there is no session', async () => {
    mockGetSession.mockResolvedValue(null)
    const { req, ctx } = makePostRequest('abc')
    const res = await POST(req, ctx)
    expect(res.status).toBe(401)
  })

  it('returns 202 with gardens on success', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockGenerateGardens.mockResolvedValue(fakeGardens)
    const { req, ctx } = makePostRequest('abc')
    const res = await POST(req, ctx)
    expect(res.status).toBe(202)
    const body = await res.json()
    expect(body).toHaveLength(2)
  })

  it('passes optional instructions to the API', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockGenerateGardens.mockResolvedValue(fakeGardens)
    const { req, ctx } = makePostRequest('abc', { instructions: 'Focus on grace' })
    await POST(req, ctx)
    expect(mockGenerateGardens).toHaveBeenCalledWith('abc', 'Focus on grace')
  })

  it('passes undefined when no instructions provided', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockGenerateGardens.mockResolvedValue(fakeGardens)
    const { req, ctx } = makePostRequest('abc')
    await POST(req, ctx)
    expect(mockGenerateGardens).toHaveBeenCalledWith('abc', undefined)
  })

  it('returns 502 when generateGardens throws', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockGenerateGardens.mockRejectedValue(new Error('Backend down'))
    const { req, ctx } = makePostRequest('abc')
    const res = await POST(req, ctx)
    expect(res.status).toBe(502)
  })
})
