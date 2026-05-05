/**
 * Tests for POST /api/auth/exchange
 *
 * This route is the invite / magic-link handshake: the client sends
 * a Supabase access + refresh token pair and gets a server-side
 * session cookie in return. It is the gateway for staff accounts
 * (invited via email) to land in the pastor UI — if it breaks, new
 * pastors can't log in at all.
 *
 * We mock the two outbound Supabase fetches (auth/v1/user and
 * rest/v1/profiles) so tests run without a network.
 */

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/session', () => ({ setSession: vi.fn() }))
vi.mock('@/lib/api/client', () => ({
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
}))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { setSession } from '@/lib/session'
import { POST } from '@/app/api/auth/exchange/route'

const mockSetSession = setSession as ReturnType<typeof vi.fn>

const validUser = { id: 'u1', email: 'pastor@church.com' }
const validProfile = {
  id: 'u1',
  name: 'Alex Pastor',
  role: 'pastor',
  church_id: 'c1',
  church: { name: 'Grace Church' },
}

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/auth/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function mockFetch(
  userStatus: number,
  profileStatus: number,
  overrides: { user?: object; profile?: object } = {},
) {
  let callCount = 0
  global.fetch = vi.fn(async () => {
    callCount++
    if (callCount === 1) {
      // First call: auth/v1/user
      return {
        ok: userStatus === 200,
        status: userStatus,
        json: async () => overrides.user ?? validUser,
      } as Response
    }
    // Second call: rest/v1/profiles
    return {
      ok: profileStatus === 200,
      status: profileStatus,
      json: async () => overrides.profile ?? validProfile,
    } as Response
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn()
})

describe('POST /api/auth/exchange', () => {
  it('returns 400 when access_token is missing', async () => {
    const res = await POST(makeRequest({ refresh_token: 'rt' }))
    expect(res.status).toBe(400)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('returns 400 when refresh_token is missing', async () => {
    const res = await POST(makeRequest({ access_token: 'at' }))
    expect(res.status).toBe(400)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('returns 400 when both tokens are missing', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 401 when Supabase rejects the access_token', async () => {
    mockFetch(401, 200)
    const res = await POST(makeRequest({ access_token: 'bad-at', refresh_token: 'rt' }))
    expect(res.status).toBe(401)
    expect(mockSetSession).not.toHaveBeenCalled()
  })

  it('returns 403 when the profile lookup fails (no profile yet)', async () => {
    mockFetch(200, 404)
    const res = await POST(makeRequest({ access_token: 'at', refresh_token: 'rt' }))
    expect(res.status).toBe(403)
    expect(mockSetSession).not.toHaveBeenCalled()
  })

  it('sets session and returns { ok: true } on success', async () => {
    mockFetch(200, 200)
    const res = await POST(makeRequest({ access_token: 'at', refresh_token: 'rt' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
  })

  it('stores the correct session shape including church info', async () => {
    mockFetch(200, 200)
    await POST(makeRequest({ access_token: 'at', refresh_token: 'rt' }))
    expect(mockSetSession).toHaveBeenCalledWith({
      accessToken: 'at',
      refreshToken: 'rt',
      user: {
        id: 'u1',
        name: 'Alex Pastor',
        email: 'pastor@church.com',
        role: 'pastor',
        church_id: 'c1',
        church_name: 'Grace Church',
      },
    })
  })

  it('handles a null church name gracefully', async () => {
    mockFetch(200, 200, {
      profile: { ...validProfile, church: null },
    })
    await POST(makeRequest({ access_token: 'at', refresh_token: 'rt' }))
    expect(mockSetSession).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ church_name: null }),
      }),
    )
  })

  it('passes the access_token as the Authorization header when calling Supabase', async () => {
    mockFetch(200, 200)
    await POST(makeRequest({ access_token: 'my-token', refresh_token: 'rt' }))
    const firstCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(firstCall[1].headers.Authorization).toBe('Bearer my-token')
  })
})
