import { ragserv } from './client'

export interface ChurchRead {
  id: string
  name: string
  alias: string | null
  city: string | null
  state: string | null
  contact_email: string | null
  contact_phone: string | null
  timezone: string | null
  bible_translation: string
}

export interface ChurchUpdate {
  name?: string
  alias?: string | null
  city?: string | null
  state?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  timezone?: string | null
  bible_translation?: string | null
}

export interface BibleVersion {
  key: string
  label: string
}

export async function getChurch(churchId: string): Promise<ChurchRead> {
  return ragserv<ChurchRead>(`/churches/${churchId}`)
}

export async function updateChurch(
  churchId: string,
  data: ChurchUpdate,
): Promise<void> {
  await ragserv(`/churches/${churchId}`, {
    method: 'PATCH',
    body: data,
  })
}

export async function getBibleVersions(): Promise<BibleVersion[]> {
  return ragserv<BibleVersion[]>('/bible-versions')
}
