import { postgrest, ragserv } from './client'
import type { Garden, GardenListItem, UpdateGardenRequest } from './types'

export async function getGarden(id: string): Promise<Garden> {
  return postgrest<Garden>(`/gardens?id=eq.${id}&select=*`, { singleRow: true })
}

/**
 * List gardens for a video.
 * Backend: GET /gardens?video_id=eq.{videoId}
 */
export async function listGardens(videoId: string): Promise<GardenListItem[]> {
  return postgrest<GardenListItem[]>(
    `/gardens?video_id=eq.${videoId}&select=id,video_id,church_id,day_number,topic,status,go_live_date,is_featured,error_message,created_at,updated_at&order=day_number.asc`,
  )
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

/**
 * Trigger garden generation for a video.
 * Backend: POST /gardens/generate  { video_id, instructions? }
 */
export async function generateGardens(
  videoId: string,
  instructions?: string,
): Promise<GardenListItem[]> {
  return ragserv<GardenListItem[]>('/gardens/generate', {
    method: 'POST',
    body: { video_id: videoId, ...(instructions ? { instructions } : {}) },
  })
}
