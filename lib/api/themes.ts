import { postgrest, ragserv } from './client'
import type { ClipSuggestion, Theme, VideoTheme } from './types'

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
  return postgrest<Theme>(`/themes?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: patch,
    returnRows: true,
    singleRow: true,
  })
}

export async function deleteTheme(id: string): Promise<void> {
  await postgrest(`/themes?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// ─── video_themes (many-to-many tagging) ──────────────────────────────────

export async function listThemesForVideo(video_id: string): Promise<Theme[]> {
  // Embed: themes joined through the video_themes row.
  //
  // Dedupe by theme.id: a sermon can now have multiple `video_themes`
  // rows for the same theme — one per clip — and the UI typically
  // wants the *set* of distinct themes the sermon has been tagged
  // with, not a per-clip multiset. (Drill-down to specific clips
  // lives at `GET /videos/{id}/theme-suggestions` for staff or at
  // `GET /videos?theme_id=…` for the parishioner browse flow.)
  const rows = await postgrest<{ theme: Theme }[]>(
    `/video_themes?video_id=eq.${encodeURIComponent(video_id)}&select=theme:themes(*)`,
  )
  const seen = new Set<string>()
  return rows
    .map((r) => r.theme)
    .filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)))
}

export async function tagVideoWithTheme(
  video_id: string,
  theme_id: string,
): Promise<VideoTheme> {
  // Inserts a video-level tag (clip_id NULL). The BEFORE-INSERT
  // trigger leaves confidence NULL for these — there's no clip
  // suggestion to look up. Use `tagVideoClipWithTheme` to promote a
  // specific LLM clip suggestion.
  return postgrest<VideoTheme>('/video_themes', {
    method: 'POST',
    body: { video_id, theme_id },
    returnRows: true,
    singleRow: true,
  })
}

export async function tagVideoClipWithTheme(
  video_id: string,
  theme_id: string,
  clip_id: string,
): Promise<VideoTheme> {
  // Inserts a clip-scoped tag. The BEFORE-INSERT trigger looks up
  // the matching `video_clip_theme_suggestions` row by (clip_id,
  // theme_id) and fills `confidence` automatically — no need to
  // pass it from the client.
  return postgrest<VideoTheme>('/video_themes', {
    method: 'POST',
    body: { video_id, theme_id, clip_id },
    returnRows: true,
    singleRow: true,
  })
}

export async function untagVideoFromTheme(
  video_id: string,
  theme_id: string,
): Promise<void> {
  // Removes BOTH video-level (clip_id NULL) and any clip-scoped
  // rows for this (video, theme). If you want to untag a single
  // clip's theme, pass a clip_id filter on top.
  await postgrest(
    `/video_themes?video_id=eq.${encodeURIComponent(video_id)}&theme_id=eq.${encodeURIComponent(theme_id)}`,
    { method: 'DELETE' },
  )
}

export async function untagVideoClipFromTheme(
  video_id: string,
  theme_id: string,
  clip_id: string,
): Promise<void> {
  await postgrest(
    `/video_themes?video_id=eq.${encodeURIComponent(video_id)}&theme_id=eq.${encodeURIComponent(theme_id)}&clip_id=eq.${encodeURIComponent(clip_id)}`,
    { method: 'DELETE' },
  )
}

// ─── Clip-level theme suggestions (LLM, staff-only) ───────────────────────

export async function getThemeSuggestionsForVideo(
  video_id: string,
): Promise<ClipSuggestion[]> {
  // Returns the nested clip-suggestion shape:
  //   [{ clip_id, start_time, end_time, summary, suggested_at,
  //      themes: [{ theme_id, theme_name, confidence }, ...] }, ...]
  //
  // Clips are sorted by start_time asc; themes within a clip by
  // confidence desc. The endpoint is staff-only — ragserv returns
  // 403 for parishioner JWTs.
  return ragserv<ClipSuggestion[]>(
    `/videos/${video_id}/theme-suggestions`,
  )
}
