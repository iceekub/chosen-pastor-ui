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
