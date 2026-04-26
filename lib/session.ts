import 'server-only'

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { SessionUser } from './api/types'

const COOKIE_NAME = 'chosen_session'
const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'dev-secret-replace-in-production',
)

/**
 * What we store in the session cookie. The Supabase tokens are kept
 * server-side (httpOnly cookie) and forwarded to PostgREST + ragserv
 * via the Authorization header. Refresh isn't wired yet — sessions
 * live the lifetime of the access token (1h by default).
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
    .sign(secret)
}

export async function decrypt(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
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
