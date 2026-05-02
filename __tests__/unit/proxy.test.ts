// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { SignJWT } from 'jose'
import { proxy } from '@/proxy'
import type { Session } from '@/lib/session'

// The dev secret matches the fallback in proxy.ts.
// Use Buffer (Node.js Uint8Array subclass) to avoid JSDOM realm mismatch with jose.
const DEV_SECRET = Buffer.from('dev-secret-replace-in-production')

/** Create a fake Supabase-style access token whose exp is `expiresInSeconds` from now. */
function makeFakeAccessToken(expiresInSeconds = 3600): string {
  const payload = { exp: Math.floor(Date.now() / 1000) + expiresInSeconds, sub: 'user-1' }
  const encoded = btoa(JSON.stringify(payload)).replace(/=/g, '')
  return `fake-header.${encoded}.fake-sig`
}

/** Sign a session payload as the `chosen_session` cookie value. */
async function makeSessionCookie(session: Session): Promise<string> {
  return new SignJWT(session as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(DEV_SECRET)
}

const baseSession: Session = {
  accessToken: '',  // overridden per test
  refreshToken: 'refresh-token-test',
  user: { id: '1', name: 'Pastor', email: 'p@test.com', role: 'pastor', church_id: '1', church_name: 'Demo Church' },
}

function makeRequest(path: string, cookieValue?: string) {
  const req = new NextRequest(`http://localhost${path}`)
  if (cookieValue) req.cookies.set('chosen_session', cookieValue)
  return req
}

beforeEach(() => vi.clearAllMocks())

describe('proxy — public paths', () => {
  it('allows /login through without checking the session', async () => {
    const res = await proxy(makeRequest('/login'))
    expect(res.status).not.toBe(302)
    expect(res.status).not.toBe(307)
  })

  it('allows /login?next=/dashboard through', async () => {
    const res = await proxy(makeRequest('/login?next=/dashboard'))
    expect(res.status).not.toBe(302)
    expect(res.status).not.toBe(307)
  })
})

describe('proxy — unauthenticated requests', () => {
  it('redirects /dashboard to /login with next param', async () => {
    const res = await proxy(makeRequest('/dashboard', 'not.a.valid.jwt'))
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('next')).toBe('/dashboard')
  })

  it('redirects /sermons to /login', async () => {
    const res = await proxy(makeRequest('/sermons', 'not.a.valid.jwt'))
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('next')).toBe('/sermons')
  })

  it('redirects /api/upload/presign to /login when no cookie present', async () => {
    const res = await proxy(makeRequest('/api/upload/presign'))
    expect(res.status).toBe(307)
  })

  it('redirects when cookie exists but JWT is invalid', async () => {
    const res = await proxy(makeRequest('/garden', 'invalid.jwt.value'))
    expect(res.status).toBe(307)
  })
})

describe('proxy — authenticated requests', () => {
  let validCookie: string

  beforeEach(async () => {
    validCookie = await makeSessionCookie({ ...baseSession, accessToken: makeFakeAccessToken(3600) })
  })

  it('allows /dashboard through for a valid session', async () => {
    const res = await proxy(makeRequest('/dashboard', validCookie))
    expect(res.status).not.toBe(307)
  })

  it('allows /sermons/upload through for a valid session', async () => {
    const res = await proxy(makeRequest('/sermons/upload', validCookie))
    expect(res.status).not.toBe(307)
  })

  it('allows /garden/123 through for a valid session', async () => {
    const res = await proxy(makeRequest('/garden/123', validCookie))
    expect(res.status).not.toBe(307)
  })
})
