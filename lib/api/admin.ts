import { edgeFunction, postgrest } from './client'
import type { Church } from './types'

/**
 * Super-admin only: onboard a new church. Goes through the
 * `churches-onboard` Edge Function which provisions a Ragie partition
 * and creates the row.
 */
export async function createChurch(payload: {
  name: string
  alias?: string
  city?: string
  state?: string
  contact_email?: string
  contact_phone?: string
  timezone?: string
  admin_email?: string
  pastors?: Array<{ name: string }>
}): Promise<Church> {
  return edgeFunction<Church>('churches-onboard', {
    method: 'POST',
    body: payload,
  })
}

/**
 * Super-admin invite: send a magic-link invite to a staff member for a
 * specific church. Passes church_id explicitly so the pastor-invite edge
 * function can associate the new account correctly, regardless of the
 * caller's own church context.
 */
export async function inviteToChurch(payload: {
  church_id: string
  email: string
  name: string
}): Promise<void> {
  await edgeFunction<void>('pastor-invite', {
    method: 'POST',
    body: { ...payload, role: 'staff' },
  })
}

/** Returns a map of church_id → parishioner count for all churches. */
export async function getParishionerCounts(): Promise<Record<string, number>> {
  const rows = await postgrest<Array<{ church_id: string | null }>>(
    '/profiles?role=eq.parishioner&select=church_id',
  )
  const counts: Record<string, number> = {}
  for (const row of rows) {
    if (row.church_id) counts[row.church_id] = (counts[row.church_id] ?? 0) + 1
  }
  return counts
}

export interface ChurchListItem {
  id: string
  name: string
  city: string | null
  state: string | null
  timezone: string | null
  contact_email: string | null
  created_at: string | null
}

/** Super-admin only: list every church. */
export async function listAllChurches(): Promise<ChurchListItem[]> {
  return postgrest<ChurchListItem[]>(
    '/churches?select=id,name,city,state,timezone,contact_email,created_at&order=created_at.desc',
  )
}

// Note: the old `switchToChurch` flow doesn't exist anymore. A
// super_admin's JWT lets them read/edit any church via RLS — the
// frontend just needs a UI for picking which church to look at,
// not a re-auth step.
