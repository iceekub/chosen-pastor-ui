vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/api/sermons', () => ({ requestPresignedUpload: vi.fn() }))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { requestPresignedUpload } from '@/lib/api/sermons'
import { GET } from '@/app/api/upload/presign/route'

const mockGetSession = getSession as ReturnType<typeof vi.fn>
const mockPresign = requestPresignedUpload as ReturnType<typeof vi.fn>

const validSession = { apiToken: 'tok', user: { id: 1 } }

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/upload/presign')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url)
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/upload/presign', () => {
  it('returns 401 when there is no session', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await GET(makeRequest({ filename: 'video.mp4', content_type: 'video/mp4' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when filename is missing', async () => {
    mockGetSession.mockResolvedValue(validSession)
    const res = await GET(makeRequest({ content_type: 'video/mp4' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when content_type is missing', async () => {
    mockGetSession.mockResolvedValue(validSession)
    const res = await GET(makeRequest({ filename: 'video.mp4' }))
    expect(res.status).toBe(400)
  })

  it('returns presign data on success', async () => {
    mockGetSession.mockResolvedValue(validSession)
    const fakeData = { upload_url: 'https://s3.example.com/upload', key: 'k', sermon_id: 99 }
    mockPresign.mockResolvedValue(fakeData)

    const res = await GET(makeRequest({ filename: 'video.mp4', content_type: 'video/mp4' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sermon_id).toBe(99)
  })

  it('returns 502 when requestPresignedUpload throws (non-dev)', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockPresign.mockRejectedValue(new Error('Backend down'))

    const res = await GET(makeRequest({ filename: 'video.mp4', content_type: 'video/mp4' }))
    expect(res.status).toBe(502)
  })
})
