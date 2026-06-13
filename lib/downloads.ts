/**
 * Pure derivation for the Downloads dashboard: one video row (with its
 * embedded fetch job + attempt history) → what the UI should say.
 *
 * Deliberately client-safe (no `server-only`) and side-effect-free so
 * the branchy logic is unit-testable without rendering anything.
 *
 * Route vocabulary: a download runs either on a fetch DEVICE (a
 * Raspberry Pi at a partner's home — there's a `fetch_jobs` row) or on
 * the CENTRAL server (Fargate; no job row, only `video_download_attempts`
 * rows carrying an `ecs_task_id`).
 */

import type {
  AttemptWithDevice,
  DownloadFailureKind,
  DownloadVideoRow,
  JobEmbed,
} from '@/lib/api/types'

export type DownloadState =
  | 'queued'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface DerivedFailure {
  kind: string | null
  explanation: string
  message: string | null
  httpStatus: number | null
}

export interface DerivedDownload {
  state: DownloadState
  /** Which route is/was doing the work; null when unknowable. */
  source: 'device' | 'central' | null
  /** Box name — null for staff (RLS) and for central; render admin-only. */
  deviceName: string | null
  /** Human step label for in-progress rows. */
  stepLabel: string | null
  percent: number | null
  /** True when the progress ping is >5 min old (device likely died; reaper will requeue). */
  progressStale: boolean
  /** Extra context under a queued row, e.g. "retrying — 1 earlier attempt failed". */
  queuedNote: string | null
  /** ISO time the download finished (completed rows). */
  completedAt: string | null
  /** Download succeeded but the pipeline failed later (transcode/Ragie). */
  laterFailure: boolean
  failure: DerivedFailure | null
  attempts: AttemptWithDevice[]
  /** A failed/cancelled fetch_jobs row that can be re-queued via ragserv. */
  retryJobId: string | null
  /** A pending fetch_jobs row that can be cancelled via ragserv. */
  cancelJobId: string | null
  /** Bulk-import job id when this download came from a channel import. */
  bulkImportJobId: string | null
}

/** Plain-English context per failure kind, for the drill-in headline. */
export const KIND_EXPLANATIONS: Record<DownloadFailureKind, string> = {
  RATE_LIMITED:
    'YouTube throttled this connection (HTTP 429). Retries usually succeed after a cooldown.',
  IP_BLOCKED:
    'YouTube blocked this IP — likely bot detection. A retry from a different device usually fixes it.',
  GEO_BLOCKED: "The video isn't available from the downloader's region.",
  AUTH_REQUIRED:
    'The video requires sign-in (age-restricted, private, or members-only).',
  UNAVAILABLE: 'The video is deleted, private, or otherwise gone from YouTube.',
  LIVESTREAM_NOT_READY:
    "YouTube hasn't finished processing this livestream recording yet. Try again later.",
  EXTRACTOR_BROKEN:
    "yt-dlp couldn't parse YouTube's page — usually fixed by a yt-dlp update.",
  NETWORK: 'Network error between the downloader and YouTube.',
  DISK_FULL: 'The downloader ran out of disk space.',
  OTHER: 'Unclassified failure — see the error output below.',
  WORKER_RESTARTED:
    'The download was interrupted by a server restart and retried.',
  DEVICE_LOST:
    'The download device went offline mid-download. The job was handed to another route.',
  CANCELLED: 'The download was cancelled by an operator.',
  TIMEOUT: 'The download took too long and was stopped.',
  AGENT_RESTART:
    'The download device restarted mid-download (likely a software update) and the job was retried.',
}

export function explainKind(kind: string | null | undefined): string {
  if (kind && kind in KIND_EXPLANATIONS) {
    return KIND_EXPLANATIONS[kind as DownloadFailureKind]
  }
  return KIND_EXPLANATIONS.OTHER
}

const PROGRESS_STALE_MS = 5 * 60 * 1000

const LIVE_JOB_STATUSES = new Set(['claimed', 'downloading', 'uploading'])

const PHASE_LABELS: Record<string, string> = {
  fetching: 'Downloading from YouTube',
  merging: 'Merging audio + video',
  uploading: 'Uploading to storage',
}

export function stepLabelFor(job: JobEmbed): string {
  if (job.status === 'claimed') return 'Assigned to a device'
  if (job.status === 'uploading') return PHASE_LABELS.uploading
  if (job.progress?.phase && PHASE_LABELS[job.progress.phase]) {
    return PHASE_LABELS[job.progress.phase]
  }
  return 'Downloading'
}

function newestFirst<T>(items: T[], at: (item: T) => string | null): T[] {
  return [...items].sort((a, b) => (at(b) ?? '').localeCompare(at(a) ?? ''))
}

function failureFromAttempt(attempt: AttemptWithDevice): DerivedFailure {
  return {
    kind: attempt.kind,
    explanation: explainKind(attempt.kind),
    message: attempt.error_message,
    httpStatus: attempt.http_status,
  }
}

export function deriveDownloadRow(
  video: DownloadVideoRow,
  now: Date = new Date(),
): DerivedDownload {
  const attempts = video.video_download_attempts ?? []
  const jobs = video.fetch_jobs ?? []
  // Tolerate multiple job rows (terminal history + a retry): newest wins.
  const job = newestFirst(jobs, (j) => j.created_at)[0] ?? null
  const liveAttempt =
    newestFirst(
      attempts.filter((a) => a.outcome === 'in_progress'),
      (a) => a.started_at,
    )[0] ?? null
  const succeeded = attempts.find((a) => a.outcome === 'succeeded') ?? null
  const lastFailed =
    newestFirst(
      attempts.filter((a) => a.outcome === 'failed'),
      (a) => a.started_at,
    )[0] ?? null

  const base: DerivedDownload = {
    state: 'queued',
    source: null,
    deviceName: null,
    stepLabel: null,
    percent: null,
    progressStale: false,
    queuedNote: null,
    completedAt: null,
    laterFailure: false,
    failure: null,
    attempts,
    retryJobId:
      job && (job.status === 'failed' || job.status === 'cancelled')
        ? job.id
        : null,
    cancelJobId: job && job.status === 'pending' ? job.id : null,
    bulkImportJobId: job?.bulk_item?.job_id ?? null,
  }

  if (video.status === 'downloading') {
    if (job && LIVE_JOB_STATUSES.has(job.status)) {
      const updatedAt = job.progress?.updated_at
        ? new Date(job.progress.updated_at).getTime()
        : null
      return {
        ...base,
        state: 'in_progress',
        source: 'device',
        deviceName: job.claimed_device?.name ?? null,
        stepLabel: stepLabelFor(job),
        percent: job.progress?.percent ?? null,
        progressStale:
          updatedAt !== null && now.getTime() - updatedAt > PROGRESS_STALE_MS,
      }
    }
    if (liveAttempt?.ecs_task_id) {
      return {
        ...base,
        state: 'in_progress',
        source: 'central',
        stepLabel: 'Downloading from YouTube',
      }
    }
    if (liveAttempt?.device_id) {
      // Device attempt open but its job row already moved on (brief
      // window around lease reaping / completion).
      return {
        ...base,
        state: 'in_progress',
        source: 'device',
        deviceName: liveAttempt.device?.name ?? null,
        stepLabel: 'Downloading',
      }
    }
    if (job?.status === 'pending') {
      return {
        ...base,
        state: 'queued',
        queuedNote:
          job.attempt_count > 0
            ? `retrying — ${job.attempt_count} earlier attempt${
                job.attempt_count === 1 ? '' : 's'
              } failed`
            : null,
      }
    }
    if (job?.status === 'done') {
      // File delivered; waiting on the transcode handoff to flip status.
      return { ...base, state: 'in_progress', source: 'device', stepLabel: 'Finishing up' }
    }
    if (job?.status === 'failed') {
      // Job exhausted its routes but the video hasn't flipped yet (or a
      // central failover is about to pick it up) — surface the error.
      return {
        ...base,
        state: 'failed',
        source: 'device',
        failure: lastFailed
          ? failureFromAttempt(lastFailed)
          : {
              kind: job.error_kind,
              explanation: explainKind(job.error_kind),
              message: job.error_message,
              httpStatus: null,
            },
      }
    }
    if (job?.status === 'cancelled') {
      return { ...base, state: 'cancelled' }
    }
    // Central route before its first attempt row, or dispatch in flight.
    return { ...base, state: 'queued', queuedNote: 'waiting to start' }
  }

  // History spine: the video has moved past `downloading`.
  if (succeeded) {
    return {
      ...base,
      state: 'completed',
      source: succeeded.ecs_task_id ? 'central' : 'device',
      deviceName: succeeded.device?.name ?? null,
      completedAt: succeeded.finished_at ?? video.updated_at,
      laterFailure:
        video.status === 'error' || video.status === 'transcode_failed',
    }
  }
  if (video.status === 'error') {
    return {
      ...base,
      state: 'failed',
      source: lastFailed
        ? lastFailed.ecs_task_id
          ? 'central'
          : 'device'
        : null,
      failure: lastFailed
        ? failureFromAttempt(lastFailed)
        : {
            kind: job?.error_kind ?? null,
            explanation: explainKind(job?.error_kind),
            message: job?.error_message ?? video.error_message,
            httpStatus: null,
          },
    }
  }
  // Defensive: video progressed but its attempts aged out of the embed.
  return { ...base, state: 'completed', completedAt: video.updated_at }
}
