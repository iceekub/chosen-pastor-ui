import 'server-only'

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { SessionUser } from './api/types'

const COOKIE_NAME = 'chosen_session'

// Resolve the session-signing key lazily so a missing secret fails the
// first request (clear runtime error) rather than silently signing
// cookies with a public default. In production an unset SESSION_SECRET
// is fatal — otherwise anyone could forge a session.
let cachedSecret: Uint8Array | null = null
function sessionSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret
  const configured = process.env.SESSION_SECRET
  if (!configured && process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set in production')
  }
  cachedSecret = new TextEncoder().encode(
    configured ?? 'dev-secret-replace-in-production',
  )
  return cachedSecret
}

/**
 * What we store in the session cookie. The Supabase tokens are kept
 * server-side (httpOnly cookie) and forwarded to PostgREST + ragserv
 * via the Authorization header. The access token (1h by default) is
 * transparently refreshed in proxy.ts before it expires, so the
 * session lives as long as the refresh token stays valid.
 */
export interface Session {
  user: SessionUser
  accessToken: string
  refreshToken: string
}

export async function encrypt(payload: Session): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(sessionSecret())
}

export async function decrypt(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ['HS256'] })
    return payload as unknown as Session
  } catch {
    return null
  }
}

export async function setSession(session: Session): Promise<void> {
  const cookieToken = await encrypt(session)
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, cookieToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return decrypt(token)
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

/* ── Church emulation (super_admin only) ───────────────────────────────────── */

const EMULATE_COOKIE = 'chosen_emulated_church'

export interface EmulatedChurch {
  id: string
  name: string
}

export async function getEmulatedChurch(): Promise<EmulatedChurch | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(EMULATE_COOKIE)?.value
  if (!raw) return null
  try {
    return JSON.parse(raw) as EmulatedChurch
  } catch {
    return null
  }
}

export async function setEmulatedChurch(church: EmulatedChurch): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(EMULATE_COOKIE, JSON.stringify(church), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
}

export async function clearEmulatedChurch(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(EMULATE_COOKIE)
}
