import { postgrest } from './client'
import type { Pastor } from './types'

/**
 * List all pastors for the caller's church (RLS-scoped).
 * Ordered by display_order ascending.
 */
export async function listPastors(churchId?: string | null): Promise<Pastor[]> {
  const churchFilter = churchId ? `&church_id=eq.${churchId}` : ''
  return postgrest<Pastor[]>(`/pastors?order=display_order.asc,name.asc${churchFilter}&select=*`)
}

export interface PastorCreate {
  name: string
  title?: string | null
}

export interface PastorUpdate {
  name?: string
  title?: string | null
  avatar_url?: string | null
  display_order?: number
}

/**
 * Create a new pastor row for the caller's church.
 * church_id is injected server-side from the session; RLS also enforces it.
 */
export async function createPastor(
  churchId: string,
  data: PastorCreate,
): Promise<Pastor> {
  const rows = await postgrest<Pastor[]>('/pastors', {
    method: 'POST',
    body: {
      church_id: churchId,
      name: data.name.trim(),
      title: data.title?.trim() || null,
    },
    returnRows: true,
  })
  return rows[0]
}

export async function updatePastor(
  id: string,
  data: PastorUpdate,
): Promise<Pastor> {
  const rows = await postgrest<Pastor[]>(`/pastors?id=eq.${id}`, {
    method: 'PATCH',
    body: data,
    returnRows: true,
  })
  return rows[0]
}

export async function deletePastor(id: string): Promise<void> {
  await postgrest(`/pastors?id=eq.${id}`, { method: 'DELETE' })
}
