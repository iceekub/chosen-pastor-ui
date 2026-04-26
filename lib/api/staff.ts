import { edgeFunction, postgrest } from './client'
import type { SessionUser } from './types'

/**
 * Staff/pastor list for the caller's church (RLS-scoped). Includes
 * the inviter themselves plus everyone they've onboarded.
 */
export async function listStaff(): Promise<SessionUser[]> {
  const rows = await postgrest<
    Array<{
      id: string
      name: string
      role: string
      church_id: string | null
    }>
  >(
    "/profiles?role=in.(super_admin,pastor,staff)&select=id,name,role,church_id&order=name.asc",
  )
  // Email isn't on profiles — it lives on auth.users which we can't read
  // from the frontend. The list page displays name + role only.
  return rows.map((r) => ({
    ...r,
    email: '',
    church_name: null,
    role: r.role as SessionUser['role'],
  }))
}

/**
 * Send a magic-link invite to a new pastor or staff member.
 * Calls the pastor-invite Edge Function which uses Supabase Auth's
 * Admin API to send the email.
 */
export async function inviteStaff(payload: {
  email: string
  name: string
  role: 'pastor' | 'staff'
}): Promise<void> {
  await edgeFunction<{ user: unknown }>('pastor-invite', {
    method: 'POST',
    body: payload,
  })
}
