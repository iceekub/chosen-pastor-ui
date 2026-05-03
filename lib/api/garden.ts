import { postgrest } from './client'
import type { Garden, UpdateGardenRequest } from './types'

export async function getGarden(id: string): Promise<Garden> {
  return postgrest<Garden>(`/gardens?id=eq.${id}&select=*`, { singleRow: true })
}

/**
 * Update a garden's topic, content, go-live date, or featured flag.
 * RLS gates writes to staff/pastor/super_admin in the row's church.
 */
export async function updateGarden(
  id: string,
  data: UpdateGardenRequest,
): Promise<Garden> {
  return postgrest<Garden>(`/gardens?id=eq.${id}`, {
    method: 'PATCH',
    body: data,
    returnRows: true,
    singleRow: true,
  })
}
