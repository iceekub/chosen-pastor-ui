import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getSession, getEmulatedChurch } from './session'
import type { SessionUser, UserRole } from './api/types'

/** Roles that are allowed to access the pastor UI. */
const PASTOR_UI_ROLES: UserRole[] = ['super_admin', 'pastor', 'staff']

/**
 * Verifies the session and returns the current user.
 * Redirects to /login if there is no valid session.
 * Redirects to /unauthorized if the user's role is not allowed in the pastor UI.
 * Memoized per-request via React cache.
 */
export const verifySession = cache(async (): Promise<SessionUser> => {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!PASTOR_UI_ROLES.includes(session.user.role)) redirect('/unauthorized')

  // Super-admin church emulation: override church_id/church_name from cookie
  // so the entire dashboard reads data for the emulated church.
  if (session.user.role === 'super_admin') {
    const emulated = await getEmulatedChurch()
    if (emulated) {
      return { ...session.user, church_id: emulated.id, church_name: emulated.name }
    }
  }

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
