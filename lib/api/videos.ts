import { postgrest, ragserv } from './client'
import type {
  Video,
  VideoListItem,
  VideoCreateResponse,
  GardenListItem,
  Garden,
} from './types'

// ─── Reads (PostgREST, RLS-scoped to caller's church) ──────────────────────

export async function getVideos(): Promise<VideoListItem[]> {
  return postgrest<VideoListItem[]>(
    '/videos?select=id,church_id,title,description,video_type,status,preached_at,created_at,updated_at,is_featured&order=created_at.desc',
  )
}

export async function getVideo(id: string): Promise<Video> {
  return postgrest<Video>(`/videos?id=eq.${id}&select=*`, { singleRow: true })
}

/** Sermon detail with embedded gardens (single round-trip via PostgREST embedding). */
export async function getVideoWithGardens(id: string): Promise<Video & {
  gardens: Pick<Garden, 'id' | 'garden_date' | 'topic' | 'status'>[]
}> {
  return postgrest(
    `/videos?id=eq.${id}&select=*,gardens(id,garden_date,topic,status)`,
    { singleRow: true },
  )
}

export async function getVideoGardens(videoId: string): Promise<GardenListItem[]> {
  return postgrest<GardenListItem[]>(
    `/gardens?video_id=eq.${videoId}&select=id,video_id,church_id,garden_date,topic,status,is_featured,error_message,created_at,updated_at&order=garden_date.asc`,
  )
}

// ─── Writes (ragserv: pipeline ops) ────────────────────────────────────────

export async function createVideo(
  title: string,
  description?: string,
  video_type = 'sermon',
): Promise<VideoCreateResponse> {
  return ragserv<VideoCreateResponse>('/videos', {
    method: 'POST',
    body: { title, description, video_type },
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
