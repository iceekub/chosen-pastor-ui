vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/api/videos', () => ({ createVideo: vi.fn() }))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { createVideo } from '@/lib/api/videos'
import { POST } from '@/app/api/upload/presign/route'

const mockGetSession = getSession as ReturnType<typeof vi.fn>
const mockCreateVideo = createVideo as ReturnType<typeof vi.fn>

const validSession = { accessToken: 'access-token-test', refreshToken: 'refresh-token-test', user: { id: '1', name: 'Test', email: 't@t', role: 'pastor' as const, church_id: 'c1', church_name: 'Demo' } }

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/upload/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/upload/presign', () => {
  it('returns 401 when there is no session', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await POST(makeRequest({ title: 'Test Sermon' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when title is missing', async () => {
    mockGetSession.mockResolvedValue(validSession)
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns presigned URL and video_id on success', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockCreateVideo.mockResolvedValue({
      id: 'abc-123',
      presigned_upload_url: 'https://s3.example.com/upload',
      title: 'Test Sermon',
      status: 'pending_upload',
    } as never)

    const res = await POST(makeRequest({ title: 'Test Sermon' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.video_id).toBe('abc-123')
    expect(body.presigned_upload_url).toBe('https://s3.example.com/upload')
  })

  it('returns 502 when createVideo throws', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockCreateVideo.mockRejectedValue(new Error('Backend down'))

    const res = await POST(makeRequest({ title: 'Test Sermon' }))
    expect(res.status).toBe(502)
  })
})
