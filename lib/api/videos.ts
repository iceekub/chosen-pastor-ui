import { postgrest, ragserv } from './client'
import type {
  Video,
  VideoListItem,
  VideoCreateResponse,
  VideoDownloadAttempt,
  VideoRole,
  GardenListItem,
  Garden,
} from './types'

// ─── Reads (PostgREST, RLS-scoped to caller's church) ──────────────────────

const VIDEO_LIST_SELECT =
  'id,church_id,title,description,video_type,status,' +
  'video_date,role,week_anchor_sunday,' +
  'created_at,updated_at,is_featured'

export async function getVideos(churchId?: string | null): Promise<VideoListItem[]> {
  const churchFilter = churchId ? `&church_id=eq.${encodeURIComponent(churchId)}` : ''
  return postgrest<VideoListItem[]>(
    `/videos?select=${VIDEO_LIST_SELECT}${churchFilter}&order=video_date.desc`,
  )
}

export async function getVideo(id: string): Promise<Video> {
  return postgrest<Video>(`/videos?id=eq.${encodeURIComponent(id)}&select=*`, { singleRow: true })
}

/** Sermon detail with embedded gardens (single round-trip via PostgREST embedding). */
export async function getVideoWithGardens(id: string): Promise<Video & {
  gardens: Pick<Garden, 'id' | 'garden_date' | 'topic' | 'content_json' | 'status' | 'is_stale'>[]
}> {
  return postgrest(
    `/videos?id=eq.${encodeURIComponent(id)}&select=*,gardens(id,garden_date,topic,content_json,status,is_stale)`,
    { singleRow: true },
  )
}

export async function getVideoGardens(videoId: string): Promise<GardenListItem[]> {
  return postgrest<GardenListItem[]>(
    `/gardens?video_id=eq.${encodeURIComponent(videoId)}&select=id,video_id,church_id,garden_date,topic,content_json,status,is_stale,is_featured,error_message,created_at,updated_at&order=garden_date.asc`,
  )
}

/** The week's primary video (for the banner on a non-primary sermon page).
 *  Returns null when the week has no primary yet. */
export async function getWeekPrimary(
  churchId: string, anchorSundayISO: string,
): Promise<VideoListItem | null> {
  const rows = await postgrest<VideoListItem[]>(
    `/videos?church_id=eq.${encodeURIComponent(churchId)}` +
      `&week_anchor_sunday=eq.${encodeURIComponent(anchorSundayISO)}` +
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
  contentType?: string,
  churchId?: string,
): Promise<VideoCreateResponse> {
  // videoDate is the sermon's calendar date (YYYY-MM-DD). Omit to
  // default to today server-side. Sunday-dated uploads auto-promote
  // to primary if the week has none — see the Primary Video feature.
  // churchId is only honoured by ragserv when the caller is a super_admin
  // (e.g. uploading while emulating a church in the pastor UI).
  return ragserv<VideoCreateResponse>('/videos', {
    method: 'POST',
    body: {
      title,
      description,
      video_type,
      ...(videoDate ? { video_date: videoDate } : {}),
      ...(contentType ? { content_type: contentType } : {}),
      ...(churchId ? { church_id: churchId } : {}),
    },
  })
}

export async function reissueUploadUrl(
  videoId: string,
  contentType?: string,
): Promise<VideoCreateResponse> {
  // Retry path: mint a fresh presigned URL for an existing video whose
  // first upload never completed (network error / expired URL). Re-signs
  // the SAME originals key, so the PUT overwrites in place — no duplicate
  // row. ragserv 409s if the video has moved past pending_upload.
  return ragserv<VideoCreateResponse>(`/videos/${videoId}/presign`, {
    method: 'POST',
    body: { ...(contentType ? { content_type: contentType } : {}) },
  })
}

export async function deleteVideo(videoId: string): Promise<void> {
  // Remove an incomplete/failed upload (ragserv allows pending_upload |
  // error | transcode_failed) and its S3 objects. 204 on success.
  await ragserv<void>(`/videos/${videoId}`, { method: 'DELETE' })
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

export async function createYouTubeVideo(
  youtube_url: string,
  title?: string,
  videoDate?: string,
  description?: string,
  churchId?: string,
): Promise<Video> {
  // ragserv kicks off the Celery download immediately and returns a
  // row with status='downloading'. Failures surface on the sermon
  // detail page (with a "use direct upload" CTA) and in the
  // staff-only diagnostics panel.
  return ragserv<Video>('/videos/youtube', {
    method: 'POST',
    body: {
      youtube_url,
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(videoDate ? { video_date: videoDate } : {}),
      ...(churchId ? { church_id: churchId } : {}),
    },
  })
}

export async function getVideoDownloadAttempts(
  videoId: string,
): Promise<VideoDownloadAttempt[]> {
  // RLS limits to same-church staff + super-admins. Sorted ascending
  // so the table reads top-to-bottom (attempt 1, 2, 3).
  return postgrest<VideoDownloadAttempt[]>(
    `/video_download_attempts?video_id=eq.${encodeURIComponent(videoId)}` +
      `&select=*&order=attempt_number.asc`,
  )
}

export async function rotateWorkerIp(): Promise<{
  deployment_id: string
  service: string
}> {
  // Force-redeploys the Celery worker ECS service. Cycles the
  // task's ENI which gives us a new egress IP (and a fresh v6 from
  // the subnet's /64). Rate-limited to one call per minute server-
  // side; the button on the diagnostics page also confirm-gates
  // before firing.
  return ragserv<{ deployment_id: string; service: string }>(
    '/infra/rotate-worker-ip',
    { method: 'POST', body: {} },
  )
}

export async function generateGardens(
  videoId: string,
  weekStartsAt: string,
  instructions?: string,
  force?: boolean,
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
      ...(force ? { force: true } : {}),
    },
  })
}
