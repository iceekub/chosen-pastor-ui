import { postgrest, ragserv } from './client'
import type {
  Video,
  VideoListItem,
  VideoCreateResponse,
  VideoRole,
  GardenListItem,
  Garden,
} from './types'

// ─── Reads (PostgREST, RLS-scoped to caller's church) ──────────────────────

const VIDEO_LIST_SELECT =
  'id,church_id,title,description,video_type,status,' +
  'video_date,role,week_anchor_sunday,' +
  'created_at,updated_at,is_featured'

export async function getVideos(): Promise<VideoListItem[]> {
  return postgrest<VideoListItem[]>(
    `/videos?select=${VIDEO_LIST_SELECT}&order=video_date.desc`,
  )
}

export async function getVideo(id: string): Promise<Video> {
  return postgrest<Video>(`/videos?id=eq.${id}&select=*`, { singleRow: true })
}

/** Sermon detail with embedded gardens (single round-trip via PostgREST embedding). */
export async function getVideoWithGardens(id: string): Promise<Video & {
  gardens: Pick<Garden, 'id' | 'garden_date' | 'topic' | 'content_json' | 'status' | 'is_stale'>[]
}> {
  return postgrest(
    `/videos?id=eq.${id}&select=*,gardens(id,garden_date,topic,content_json,status,is_stale)`,
    { singleRow: true },
  )
}

export async function getVideoGardens(videoId: string): Promise<GardenListItem[]> {
  return postgrest<GardenListItem[]>(
    `/gardens?video_id=eq.${videoId}&select=id,video_id,church_id,garden_date,topic,content_json,status,is_stale,is_featured,error_message,created_at,updated_at&order=garden_date.asc`,
  )
}

/** The week's primary video (for the banner on a non-primary sermon page).
 *  Returns null when the week has no primary yet. */
export async function getWeekPrimary(
  churchId: string, anchorSundayISO: string,
): Promise<VideoListItem | null> {
  const rows = await postgrest<VideoListItem[]>(
    `/videos?church_id=eq.${churchId}` +
      `&week_anchor_sunday=eq.${anchorSundayISO}` +
      `&role=eq.primary` +
      `&select=${VIDEO_LIST_SELECT}` +
      `&limit=1`,
  )
  return rows[0] ?? null
}

// ─── Writes (ragserv: pipeline ops) ────────────────────────────────────────

export async function createVideo(
  title: string,
  description?: string,
  video_type = 'sermon',
  videoDate?: string,
): Promise<VideoCreateResponse> {
  // videoDate is the sermon's calendar date (YYYY-MM-DD). Omit to
  // default to today server-side. Sunday-dated uploads auto-promote
  // to primary if the week has none — see the Primary Video feature.
  return ragserv<VideoCreateResponse>('/videos', {
    method: 'POST',
    body: {
      title,
      description,
      video_type,
      ...(videoDate ? { video_date: videoDate } : {}),
    },
  })
}

export async function setVideoRole(
  videoId: string, role?: VideoRole, videoDate?: string,
): Promise<Video> {
  // Hits ragserv's PATCH /videos/{id}, which handles all transition
  // invariants (one primary per week, demote-old, mark-stale, etc).
  // Either field may be omitted; sending only video_date shifts the
  // week and re-evaluates auto-promote without an explicit role
  // change.
  return ragserv<Video>(`/videos/${videoId}`, {
    method: 'PATCH',
    body: {
      ...(role ? { role } : {}),
      ...(videoDate ? { video_date: videoDate } : {}),
    },
  })
}

export async function completeUpload(videoId: string): Promise<Video> {
  return ragserv<Video>(`/videos/${videoId}/upload-complete`, {
    method: 'POST',
    body: {},
  })
}

export async function generateGardens(
  videoId: string,
  weekStartsAt: string,
  instructions?: string,
): Promise<GardenListItem[]> {
  // weekStartsAt: ISO date for a Monday (YYYY-MM-DD). Ragserv validates
  // that it's actually a Monday and rejects with 422 otherwise; we
  // also validate at the form-input layer for a better error.
  return ragserv<GardenListItem[]>('/gardens/generate', {
    method: 'POST',
    body: {
      video_id: videoId,
      week_starts_at: weekStartsAt,
      ...(instructions ? { instructions } : {}),
    },
  })
}
