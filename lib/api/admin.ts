import { apiPost } from './client'
import type { Congregation } from './types'

/** Super-admin only: impersonate a church admin */
export async function switchToChurch(church_id: number): Promise<void> {
  return apiPost('/user/set_church', { church_id })
}

/** Super-admin only: onboard a new church */
export async function createChurch(
  data: Omit<Congregation, 'id'>
): Promise<Congregation> {
  return apiPost<Congregation>('/church/create', data)
}
