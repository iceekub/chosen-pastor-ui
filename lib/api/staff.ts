import { edgeFunction, postgrest } from './client'
import type { SessionUser } from './types'

/**
 * Team list for the caller's church (RLS-scoped).
 * Includes super_admin, pastor (legacy), and staff roles.
 */
export async function listStaff(churchId?: string | null): Promise<SessionUser[]> {
  const churchFilter = churchId ? `&church_id=eq.${churchId}` : ''
  const rows = await postgrest<
    Array<{
      id: string
      name: string
      role: string
      church_id: string | null
    }>
  >(
    `/profiles?role=in.(super_admin,pastor,staff)${churchFilter}&select=id,name,role,church_id&order=name.asc`,
  )
  return rows.map((r) => ({
    ...r,
    email: '',
    church_name: null,
    role: r.role as SessionUser['role'],
  }))
}

/**
 * Send a magic-link invite to a new team member.
 * Calls the pastor-invite Edge Function which uses Supabase Auth's
 * Admin API to send the email.
 */
export async function inviteStaff(payload: {
  email: string
  name: string
  role: 'staff'
}): Promise<void> {
  await edgeFunction<{ user: unknown }>('pastor-invite', {
    method: 'POST',
    body: payload,
  })
}
