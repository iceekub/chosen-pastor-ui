import { postgrest } from './client'
import type { Theme, VideoTheme } from './types'

// ─── Theme CRUD (PostgREST, RLS-scoped) ───────────────────────────────────

export async function listThemes(): Promise<Theme[]> {
  return postgrest<Theme[]>(
    '/themes?select=*&order=display_order.asc,name.asc',
  )
}

export async function createTheme(name: string, image_url?: string): Promise<Theme> {
  return postgrest<Theme>('/themes', {
    method: 'POST',
    body: { name, image_url: image_url ?? null },
    returnRows: true,
    singleRow: true,
  })
}

export async function updateTheme(
  id: string,
  patch: { name?: string; image_url?: string | null; display_order?: number },
): Promise<Theme> {
  return postgrest<Theme>(`/themes?id=eq.${id}`, {
    method: 'PATCH',
    body: patch,
    returnRows: true,
    singleRow: true,
  })
}

export async function deleteTheme(id: string): Promise<void> {
  await postgrest(`/themes?id=eq.${id}`, { method: 'DELETE' })
}

// ─── video_themes (many-to-many tagging) ──────────────────────────────────

export async function listThemesForVideo(video_id: string): Promise<Theme[]> {
  // Embed: themes joined through the video_themes row.
  const rows = await postgrest<{ theme: Theme }[]>(
    `/video_themes?video_id=eq.${video_id}&select=theme:themes(*)`,
  )
  return rows.map((r) => r.theme)
}

export async function tagVideoWithTheme(
  video_id: string,
  theme_id: string,
): Promise<VideoTheme> {
  return postgrest<VideoTheme>('/video_themes', {
    method: 'POST',
    body: { video_id, theme_id },
    returnRows: true,
    singleRow: true,
  })
}

export async function untagVideoFromTheme(
  video_id: string,
  theme_id: string,
): Promise<void> {
  await postgrest(
    `/video_themes?video_id=eq.${video_id}&theme_id=eq.${theme_id}`,
    { method: 'DELETE' },
  )
}
