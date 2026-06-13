/**
 * Fetch-fleet data access: the Downloads + Fleet dashboards.
 *
 * Reads go straight to PostgREST under the user's JWT — RLS does all
 * the scoping (staff: own church's jobs/attempts; super_admin: all,
 * plus the fleet). Embedding device names relies on RLS-on-embed:
 * `fetch_devices` rows are invisible to staff, so `device:device_id(name)`
 * comes back null for them and the box name never leaves the server.
 *
 * Writes (enable/disable a device, retry/cancel a job) proxy ragserv's
 * /fetch/* admin API, which re-enforces roles server-side.
 */

import 'server-only'

import { postgrest, ragserv } from '@/lib/api/client'
import type {
  DeviceFailure,
  DownloadVideoRow,
  FetchDevice,
  FetchJob,
  ProxyAttempt,
} from '@/lib/api/types'

// ─── Downloads page reads ───────────────────────────────────────────

const ATTEMPT_EMBED =
  'video_download_attempts(id,attempt_number,outcome,kind,http_status,error_message,' +
  'ip_family,egress_ip,yt_dlp_version,ecs_task_id,device_id,fetch_job_id,route,downloaded_bytes,' +
  'started_at,finished_at,device:device_id(name))'

const JOB_EMBED =
  'fetch_jobs(id,status,progress,attempt_count,max_devices,bulk_import_item_id,' +
  'error_kind,error_message,claimed_at,created_at,finished_at,' +
  'claimed_device:claimed_by_device_id(name),bulk_item:bulk_import_item_id(job_id))'

const DOWNLOAD_SPINE_SELECT =
  'id,title,church_id,status,error_message,created_at,updated_at,' +
  `churches(name),${ATTEMPT_EMBED},${JOB_EMBED}`

/** Videos currently downloading (queued or in flight on some route). */
export async function getActiveDownloads(
  churchId?: string | null,
): Promise<DownloadVideoRow[]> {
  const churchFilter = churchId
    ? `&church_id=eq.${encodeURIComponent(churchId)}`
    : ''
  return postgrest<DownloadVideoRow[]>(
    `/videos?status=eq.downloading&youtube_url=not.is.null${churchFilter}` +
      `&select=${DOWNLOAD_SPINE_SELECT}` +
      `&video_download_attempts.order=attempt_number.asc` +
      `&order=created_at.desc`,
  )
}

function sinceISO(windowDays: number): string {
  return new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString()
}

/**
 * Recently-finished downloads (completed or failed) — videos that moved
 * past `downloading` within the last `windowDays`. Relies on the
 * `videos_set_updated_at` trigger bumping `updated_at` on every status
 * transition.
 */
export async function getRecentDownloadHistory(
  churchId: string | null | undefined,
  windowDays: number,
): Promise<DownloadVideoRow[]> {
  const churchFilter = churchId
    ? `&church_id=eq.${encodeURIComponent(churchId)}`
    : ''
  return postgrest<DownloadVideoRow[]>(
    `/videos?youtube_url=not.is.null` +
      `&status=in.(transcoding,transcode_failed,uploaded,processing,ready,error)` +
      `&updated_at=gte.${encodeURIComponent(sinceISO(windowDays))}${churchFilter}` +
      `&select=${DOWNLOAD_SPINE_SELECT}` +
      `&video_download_attempts.order=attempt_number.asc` +
      `&order=updated_at.desc&limit=100`,
  )
}

// ─── Fleet page reads (super_admin — RLS returns [] for anyone else) ─

export async function getFetchDevices(): Promise<FetchDevice[]> {
  return postgrest<FetchDevice[]>('/fetch_devices?select=*&order=name.asc')
}

/**
 * All attempts that ran through the commercial residential proxy
 * within the window — succeeded and failed — for the Fleet page's
 * proxy stats (counts, GB transferred, estimated spend).
 */
export async function getRecentProxyAttempts(
  windowDays: number,
): Promise<ProxyAttempt[]> {
  return postgrest<ProxyAttempt[]>(
    `/video_download_attempts?route=eq.proxy` +
      `&started_at=gte.${encodeURIComponent(sinceISO(windowDays))}` +
      `&select=id,outcome,kind,downloaded_bytes,started_at,finished_at,` +
      `video:videos(id,title)` +
      `&order=started_at.desc&limit=500`,
  )
}

/** Failed attempts that ran on a fetch device within the window. */
export async function getRecentDeviceFailures(
  windowDays: number,
): Promise<DeviceFailure[]> {
  return postgrest<DeviceFailure[]>(
    `/video_download_attempts?device_id=not.is.null&outcome=eq.failed` +
      `&started_at=gte.${encodeURIComponent(sinceISO(windowDays))}` +
      `&select=id,device_id,kind,http_status,error_message,egress_ip,started_at,finished_at,` +
      `video:videos(id,title)` +
      `&order=started_at.desc&limit=500`,
  )
}

// ─── ragserv writes (roles re-enforced server-side) ─────────────────

/** ragserv's DeviceRead — FetchDevice minus the PostgREST-only updated_at. */
type DeviceWriteResponse = Omit<FetchDevice, 'updated_at'>
/** ragserv's JobRead — FetchJob minus updated_at. */
type JobWriteResponse = Omit<FetchJob, 'updated_at'>

export async function enableFetchDevice(id: string): Promise<DeviceWriteResponse> {
  return ragserv<DeviceWriteResponse>(
    `/fetch/devices/${encodeURIComponent(id)}/enable`,
    { method: 'POST' },
  )
}

export async function disableFetchDevice(id: string): Promise<DeviceWriteResponse> {
  return ragserv<DeviceWriteResponse>(
    `/fetch/devices/${encodeURIComponent(id)}/disable`,
    { method: 'POST' },
  )
}

export async function retryFetchJob(id: string): Promise<JobWriteResponse> {
  return ragserv<JobWriteResponse>(
    `/fetch/jobs/${encodeURIComponent(id)}/retry`,
    { method: 'POST' },
  )
}

export async function cancelFetchJob(id: string): Promise<JobWriteResponse> {
  return ragserv<JobWriteResponse>(
    `/fetch/jobs/${encodeURIComponent(id)}/cancel`,
    { method: 'POST' },
  )
}
