/**
 * Next.js proxy (formerly middleware).
 *
 * Runs on every protected route. Does two things:
 *  1. Redirects unauthenticated visitors to /login.
 *  2. Transparently refreshes the Supabase access token when it is within
 *     REFRESH_THRESHOLD_SECONDS of expiry, then rewrites the session cookie
 *     before the request hits any page or API route.
 *
 * Must be self-contained (no server-only imports, no next/headers).
 * Crypto via jose, which is Edge-compatible.
 */

import { NextRequest, NextResponse } from 'next/server'
import { SignJWT, jwtVerify } from 'jose'

const COOKIE_NAME = 'chosen_session'
const REFRESH_THRESHOLD_SECONDS = 5 * 60 // refresh if < 5 min remaining

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'dev-secret-replace-in-production',
)

const PUBLIC_PATHS = ['/login', '/unauthorized']

/** Decode a JWT payload without verifying the signature (we trust Supabase). */
function getJwtExp(token: string): number | null {
  try {
    const part = token.split('.')[1]
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=')
    const json = atob(padded)
    const payload = JSON.parse(json)
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

/** Exchange a refresh token for a new access + refresh token pair. */
async function refreshTokens(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return null

  try {
    const res = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      },
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data.access_token || !data.refresh_token) return null
    return { accessToken: data.access_token, refreshToken: data.refresh_token }
  } catch {
    return null
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Let public paths through immediately.
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const cookieValue = request.cookies.get(COOKIE_NAME)?.value

  // No session cookie → redirect to login.
  if (!cookieValue) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Decrypt our session cookie.
  let session: Record<string, unknown>
  try {
    const { payload } = await jwtVerify(cookieValue, secret, { algorithms: ['HS256'] })
    session = payload as Record<string, unknown>
  } catch {
    // Invalid / expired session cookie → redirect to login.
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const accessToken = session.accessToken as string | undefined
  const storedRefreshToken = session.refreshToken as string | undefined
  if (!accessToken || !storedRefreshToken) return NextResponse.next()

  // Check if the Supabase access token needs refreshing.
  const exp = getJwtExp(accessToken)
  if (exp === null) return NextResponse.next()

  const nowSeconds = Math.floor(Date.now() / 1000)
  if (exp - nowSeconds > REFRESH_THRESHOLD_SECONDS) {
    return NextResponse.next() // still fresh
  }

  // Refresh.
  const newTokens = await refreshTokens(storedRefreshToken)
  if (!newTokens) {
    // Couldn't refresh (network error, token revoked). Let the request
    // through — the API call will 401 and verifySession will redirect.
    return NextResponse.next()
  }

  // Re-encrypt the session with the new tokens.
  const { iat: _iat, exp: _exp, ...sessionData } = session
  const updatedSession = {
    ...sessionData,
    accessToken: newTokens.accessToken,
    refreshToken: newTokens.refreshToken,
  }

  const newCookieValue = await new SignJWT(updatedSession)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)

  const response = NextResponse.next()
  response.cookies.set(COOKIE_NAME, newCookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
