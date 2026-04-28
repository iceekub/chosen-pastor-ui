import { apiGet, apiPost } from './client'
import type { Garden, GardenListItem } from './types'

export async function getGarden(id: string): Promise<Garden> {
  return apiGet<Garden>(`/gardens/${id}`)
}

/**
 * List gardens for a video.
 * Backend: GET /gardens?video_id={videoId}
 */
export async function listGardens(videoId: string): Promise<GardenListItem[]> {
  return apiGet<GardenListItem[]>(`/gardens?video_id=${videoId}`)
}

/**
 * Trigger garden generation for a video.
 * Backend: POST /gardens/generate  { video_id, instructions? }
 */
export async function generateGardens(
  videoId: string,
  instructions?: string,
): Promise<GardenListItem[]> {
  return apiPost<GardenListItem[]>('/gardens/generate', {
    video_id: videoId,
    ...(instructions ? { instructions } : {}),
  })
}
