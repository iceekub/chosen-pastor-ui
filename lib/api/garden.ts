import { postgrest } from './client'
import type { Garden, GardenContent, UpdateGardenRequest } from './types'

/**
 * The AI-generated display title (≤22 chars) from content_json,
 * falling back to the topic when absent (older/seed records).
 */
export function gardenDisplayTitle(topic: string, content_json: GardenContent | null | undefined): string {
  return content_json?.title || topic
}

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
