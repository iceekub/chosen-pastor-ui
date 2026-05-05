import { ragserv, postgrest } from './client'

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
  logo_url: string | null
  logo_search_url: string | null
  alt_logo_url: string | null
  image_url: string | null
}

/** Lightweight logo fetch used by the dashboard layout for the sidebar. */
export async function getChurchLogoUrl(
  churchId: string,
): Promise<string | null> {
  try {
    const row = await postgrest<{ logo_url: string | null }>(
      `/churches?id=eq.${churchId}&select=logo_url`,
      { singleRow: true },
    )
    return row?.logo_url ?? null
  } catch {
    return null
  }
}

export interface ChurchAssets {
  logo_url: string | null
  logo_search_url: string | null
  alt_logo_url: string | null
  image_url: string | null
}

/**
 * Fetch asset URLs directly from PostgREST (bypasses ragserv which may not
 * return logo_url / image_url). Used in the settings page alongside getChurch.
 */
export async function getChurchAssets(
  churchId: string,
): Promise<ChurchAssets> {
  try {
    return await postgrest<ChurchAssets>(
      `/churches?id=eq.${churchId}&select=logo_url,logo_search_url,alt_logo_url,image_url`,
      { singleRow: true },
    )
  } catch {
    return { logo_url: null, logo_search_url: null, alt_logo_url: null, image_url: null }
  }
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
