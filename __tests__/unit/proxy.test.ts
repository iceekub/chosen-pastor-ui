import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock decrypt so we control what sessions look like
vi.mock('@/lib/session', () => ({
  decrypt: vi.fn(),
}))

import { decrypt } from '@/lib/session'
import { proxy } from '@/proxy'
import type { Session } from '@/lib/session'

const mockDecrypt = decrypt as ReturnType<typeof vi.fn>

const validSession: Session = {
  accessToken: 'access-token-test', refreshToken: 'refresh-token-test',
  user: {
    id: '1', name: 'Pastor', email: 'p@test.com',
    role: 'pastor', church_id: '1', church_name: 'Demo Church',
  },
}

function makeRequest(path: string, cookieValue?: string) {
  const req = new NextRequest(`http://localhost${path}`)
  if (cookieValue) {
    req.cookies.set('chosen_token', cookieValue)
  }
  return req
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('proxy — public paths', () => {
  it('allows /login through without checking the session', async () => {
    const req = makeRequest('/login')
    const res = await proxy(req)
    expect(mockDecrypt).not.toHaveBeenCalled()
    expect(res.status).not.toBe(302)
  })

  it('allows /login?next=/dashboard through', async () => {
    const req = makeRequest('/login?next=/dashboard')
    const res = await proxy(req)
    expect(res.status).not.toBe(302)
  })
})

describe('proxy — unauthenticated requests', () => {
  beforeEach(() => {
    mockDecrypt.mockResolvedValue(null)
  })

  it('redirects /dashboard to /login with next param', async () => {
    const req = makeRequest('/dashboard', 'bad-token')
    const res = await proxy(req)
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('next')).toBe('/dashboard')
  })

  it('redirects /sermons to /login', async () => {
    const req = makeRequest('/sermons', 'bad-token')
    const res = await proxy(req)
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('next')).toBe('/sermons')
  })

  it('redirects /api/upload/presign to /login when no cookie present', async () => {
    const req = makeRequest('/api/upload/presign') // no cookie at all
    const res = await proxy(req)
    expect(res.status).toBe(307)
  })

  it('redirects when cookie exists but decrypt returns null (expired)', async () => {
    const req = makeRequest('/garden', 'expired-token')
    const res = await proxy(req)
    expect(res.status).toBe(307)
  })
})

describe('proxy — authenticated requests', () => {
  beforeEach(() => {
    mockDecrypt.mockResolvedValue(validSession)
  })

  it('allows /dashboard through for a valid session', async () => {
    const req = makeRequest('/dashboard', 'valid-token')
    const res = await proxy(req)
    expect(res.status).not.toBe(307)
  })

  it('allows /sermons/upload through for a valid session', async () => {
    const req = makeRequest('/sermons/upload', 'valid-token')
    const res = await proxy(req)
    expect(res.status).not.toBe(307)
  })

  it('allows /garden/123 through for a valid session', async () => {
    const req = makeRequest('/garden/123', 'valid-token')
    const res = await proxy(req)
    expect(res.status).not.toBe(307)
  })
})
