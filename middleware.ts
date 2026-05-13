/**
 * Next.js middleware — Supabase access-token refresh.
 *
 * The session cookie holds both the Supabase access token (1-hour TTL) and
 * the refresh token.  Without this middleware the access token silently
 * expires and every PostgREST / ragserv call starts returning 401.
 *
 * On every request we:
 *  1. Decrypt the session cookie.
 *  2. Base64-decode the Supabase JWT payload to read its `exp` claim.
 *  3. If the token is expired or will expire within 60 s, call the Supabase
 *     refresh endpoint and re-encrypt the session with the new tokens.
 *  4. Set the updated cookie on both the forwarded request (so server
 *     components see it via `cookies()`) and the response (so the browser
 *     stores it).
 *
 * If refresh fails (revoked token, network error) we delete the session so
 * the user is redirected to /login on their next navigation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { SignJWT, jwtVerify } from 'jose'

const COOKIE_NAME = 'chosen_session'

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'dev-secret-replace-in-production',
)

/** Decode the `exp` claim from a JWT without verifying the signature. */
function getJwtExp(token: string): number | null {
  try {
    const [, payloadB64] = token.split('.')
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(json)
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

interface Session {
  user: unknown
  accessToken: string
  refreshToken: string
}

async function refreshSupabaseToken(
  supabaseUrl: string,
  anonKey: string,
  refreshToken: string,
): Promise<{ access_token: string; refresh_token: string } | null> {
  try {
    const res = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
      {
        method: 'POST',
        headers: {
          apikey: anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      },
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

async function encryptSession(session: Session): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function middleware(request: NextRequest) {
  const cookieToken = request.cookies.get(COOKIE_NAME)?.value
  if (!cookieToken) return NextResponse.next()

  // Decrypt our session wrapper JWT.
  let session: Session | null = null
  try {
    const { payload } = await jwtVerify(cookieToken, secret, { algorithms: ['HS256'] })
    session = payload as unknown as Session
  } catch {
    // Malformed / expired wrapper cookie — pass through; DAL will redirect to /login.
    return NextResponse.next()
  }

  if (!session?.accessToken) return NextResponse.next()

  // Check whether the Supabase access token needs refreshing.
  const exp = getJwtExp(session.accessToken)
  const nowSec = Math.floor(Date.now() / 1000)
  // Refresh if expired or will expire within 60 seconds.
  if (exp !== null && exp > nowSec + 60) return NextResponse.next()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey || !session.refreshToken) {
    return NextResponse.next()
  }

  const newTokens = await refreshSupabaseToken(supabaseUrl, anonKey, session.refreshToken)

  if (!newTokens) {
    // Refresh failed (token revoked, etc.) — delete session so the user gets
    // redirected to /login by the DAL on their next protected-route hit.
    const res = NextResponse.next()
    res.cookies.delete(COOKIE_NAME)
    return res
  }

  const updatedSession: Session = {
    ...session,
    accessToken: newTokens.access_token,
    refreshToken: newTokens.refresh_token,
  }
  const newCookieToken = await encryptSession(updatedSession)

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  }

  // Update the request cookie so server components see the new token via
  // `cookies()` in the same request cycle.
  request.cookies.set(COOKIE_NAME, newCookieToken)
  const response = NextResponse.next({ request })

  // Also set on the response so the browser stores the refreshed cookie.
  response.cookies.set(COOKIE_NAME, newCookieToken, cookieOpts)

  return response
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static assets.
    '/((?!_next/static|_next/image|favicon\\.ico).*)',
  ],
}
