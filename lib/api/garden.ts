import { apiGet, apiPost, apiPut } from './client'
import type { Garden, UpdateGardenRequest, CreateGardenRequest } from './types'

export async function getGarden(id: string): Promise<Garden> {
  return apiGet<Garden>(`/gardens/${id}`)
}

/**
 * Update a garden's topic or content.
 * Note: backend endpoint for this may not exist yet — the frontend route
 * handler will stub this until the backend adds PUT /gardens/{id}.
 */
export async function updateGarden(
  id: string,
  data: UpdateGardenRequest
): Promise<Garden> {
  return apiPut<Garden>(`/gardens/${id}`, data)
}

/**
 * Create a garden manually (not via AI generation).
 * Note: backend endpoint for this may not exist yet — the frontend route
 * handler will stub this until the backend adds POST /gardens.
 */
export async function createGarden(data: CreateGardenRequest): Promise<Garden> {
  return apiPost<Garden>('/gardens', data)
}
