import { apiPost } from './client'
import type { Church } from './types'

/** Super-admin only: impersonate a church admin */
export async function switchToChurch(church_id: string): Promise<void> {
  return apiPost('/user/set_church', { church_id })
}

/** Super-admin only: onboard a new church */
export async function createChurch(name: string): Promise<Church> {
  return apiPost<Church>('/churches', { name })
}
