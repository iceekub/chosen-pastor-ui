import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getSession } from './session'
import type { SessionUser } from './api/types'

/**
 * Verifies the session and returns the current user.
 * Redirects to /login if there is no valid session.
 * Memoized per-request via React cache.
 */
export const verifySession = cache(async (): Promise<SessionUser> => {
  const session = await getSession()
  if (!session) redirect('/login')
  return session.user
})

/**
 * Returns the session or null without redirecting.
 * Use this in layouts where you want to conditionally render.
 */
export const getOptionalSession = cache(async () => {
  return getSession()
})

/** Guard for super-admin only routes */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await verifySession()
  if (user.role !== 'super_admin') redirect('/dashboard')
  return user
}
