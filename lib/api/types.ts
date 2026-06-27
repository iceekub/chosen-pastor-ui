/**
 * Types matching the Chosen schema (Supabase Postgres) + ragserv responses.
 * Mirror of `backend/supabase/migrations/20260425000001_init.sql`.
 */

export type UserRole = 'super_admin' | 'pastor' | 'staff' | 'parishioner' // 'pastor' kept for backward compat until DB migration

export interface SessionUser {
  id: string
  name: string
  email: string
  role: UserRole
  church_id: string | null
  church_name: string | null
}

// ─── Videos (sermons) ───────────────────────────────────────────────────────

/**
 * Lifecycle states a video moves through. Mirrors the DB CHECK on
 * `videos.status` (init.sql + 20260430000002_video_transcoding_fields).
 *
 *   pending_upload  → waiting for the client PUT to S3
 *   downloading     → YouTube import in flight
 *   transcoding     → MediaConvert running (often several minutes)
 *   transcode_failed → MediaConvert errored; row is terminal
 *   uploaded        → transcoded MP4 + thumbnails landed; Ragie kicks off
 *   processing      → Ragie indexing
 *   ready           → transcript saved, gardens generatable
 *   error           → terminal failure outside the transcode path
 */
export type VideoStatus =
  | 'pending_upload'
  | 'downloading'
  | 'transcoding'
  | 'transcode_failed'
  | 'uploaded'
  | 'processing'
  | 'ready'
  | 'error'

/**
 * Per-week role of a video. Mirrors ragserv's VideoRole enum.
 *
 * - `primary`   — drives the week's gardens (transcript is the source).
 * - `secondary` — its summary is added as supplemental context.
 * - `ignored`   — present in the church library but not used for
 *                 garden generation. Default for new uploads unless
 *                 auto-promotion fires (Sunday-dated + week is empty).
 */
export type VideoRole = 'primary' | 'secondary' | 'ignored'

export interface Video {
  id: string
  church_id: string
  created_by: string | null
  title: string
  description: string | null
  video_type: string
  youtube_url: string | null
  s3_key: string | null
  /** Public URL of the currently-displayed thumbnail. Set by ragserv
   *  at transcode-complete to one of the auto-generated frame
   *  captures (middle frame by default), and may be overridden by
   *  staff via the thumbnail picker (either to a different
   *  auto-frame URL or to a custom upload in the video-thumbnails
   *  Supabase Storage bucket). */
  thumbnail_url: string | null
  /** Stores the most recent custom-uploaded thumbnail URL separately
   *  from thumbnail_url so it persists even after switching back to
   *  an auto-generated frame. */
  custom_thumbnail_url: string | null
  /** S3 keys of the auto-generated MediaConvert frame captures (≤5).
   *  Used by the thumbnail picker to render alternate auto-frame
   *  candidates the staff can select from. Empty for YouTube imports
   *  and any video that hasn't been transcoded. */
  thumbnail_keys: string[]
  /** ISO date (YYYY-MM-DD) the sermon is for. Defaults to upload day. */
  video_date: string
  role: VideoRole
  /** ISO date — the Sunday of the Sun-Sat span containing video_date.
   *  Server-derived; the UI uses it to group videos by week. */
  week_anchor_sunday: string
  duration_seconds: number | null
  status: VideoStatus
  ragie_document_id: string | null
  transcript: string | null
  transcript_tokens: number | null
  summary: string | null
  error_message: string | null
  is_featured: boolean
  created_at: string
  updated_at: string | null
}

/** Subset used in list views — same shape, just a documented contract. */
export type VideoListItem = Pick<
  Video,
  | 'id'
  | 'church_id'
  | 'title'
  | 'description'
  | 'video_type'
  | 'status'
  | 'video_date'
  | 'role'
  | 'week_anchor_sunday'
  | 'created_at'
  | 'updated_at'
  | 'is_featured'
>

/** Response from ragserv POST /videos — Video + presigned URL. */
export interface VideoCreateResponse extends Video {
  presigned_upload_url: string
}

// ─── Video download attempts (yt-dlp audit log, staff-only) ────────────────
//
// One row per yt-dlp attempt for a YouTube/Facebook ingest. Lets staff
// answer "why did this fail" and "are we being throttled" without
// CloudWatch. RLS limits reads to the same-church staff plus
// super-admins. See ragserv ``DownloadFailureKind`` for the kind values.

export type DownloadFailureKind =
  | 'RATE_LIMITED'
  | 'IP_BLOCKED'
  | 'GEO_BLOCKED'
  | 'AUTH_REQUIRED'
  | 'UNAVAILABLE'
  | 'LIVESTREAM_NOT_READY'
  | 'EXTRACTOR_BROKEN'
  | 'NETWORK'
  | 'DISK_FULL'
  | 'OTHER'
  | 'WORKER_RESTARTED'
  // Fetch-fleet kinds (downloads running on residential Raspberry Pis):
  | 'DEVICE_LOST'
  | 'CANCELLED'
  | 'TIMEOUT'
  | 'AGENT_RESTART'

export interface VideoDownloadAttempt {
  id: string
  video_id: string
  attempt_number: number
  url: string
  outcome: 'in_progress' | 'succeeded' | 'failed'
  kind: DownloadFailureKind | null
  http_status: number | null
  error_message: string | null
  ip_family: 'ipv4' | 'ipv6' | null
  egress_ip: string | null
  yt_dlp_version: string | null
  /** Set on CENTRAL (Fargate) attempts; null for device attempts. */
  ecs_task_id: string | null
  /** Set on fetch-DEVICE attempts; null for central attempts. */
  device_id: string | null
  fetch_job_id: string | null
  /**
   * Which infrastructure ran the attempt. Proxy attempts execute on
   * the same ECS worker as central ones, so this is the only honest
   * discriminator. Null only on pre-attribution historical rows.
   */
  route: 'device' | 'proxy' | 'central' | null
  /** File size on success — the proxy route's per-GB bill is made of this. */
  downloaded_bytes: number | null
  started_at: string
  finished_at: string | null
}

// ─── Fetch fleet (residential Raspberry Pi downloaders) ────────────────────
//
// YouTube blocks AWS IPs, so downloads run on Pis at partners' homes.
// `fetch_jobs` is the queue (staff-readable for their church via RLS);
// `fetch_devices` is the global fleet (super_admin-only via RLS — embeds
// of device names silently return null for staff, which is what keeps
// box names admin-only in the UI).

export type FetchJobKind = 'youtube_video' | 'channel_list' | 'url_fetch'

export type FetchJobStatus =
  | 'pending'
  | 'claimed'
  | 'downloading'
  | 'uploading'
  | 'done'
  | 'failed'
  | 'cancelled'

/** Latest progress ping from the device agent; null until the first ping. */
export interface FetchJobProgress {
  phase: 'fetching' | 'merging' | 'uploading'
  percent: number | null
  downloaded_bytes: number | null
  total_bytes: number | null
  updated_at: string
}

export interface FetchJob {
  id: string
  church_id: string
  kind: FetchJobKind
  url: string
  video_id: string | null
  bulk_import_item_id: string | null
  status: FetchJobStatus
  priority: number
  payload: Record<string, unknown> | null
  claimed_by_device_id: string | null
  lease_expires_at: string | null
  claimed_at: string | null
  attempt_count: number
  attempted_device_ids: string[]
  max_devices: number
  attempt_log: Record<string, unknown>[]
  progress: FetchJobProgress | null
  result: Record<string, unknown> | null
  /** DownloadFailureKind constant; DB stores free text — treat unknown values as OTHER. */
  error_kind: string | null
  error_message: string | null
  created_at: string
  updated_at: string
  finished_at: string | null
}

// Embed shapes for the Downloads dashboard's PostgREST spine queries
// (see lib/api/fetch.ts). Defined here so client components, the pure
// derivation helper (lib/downloads.ts), and test factories can import
// them without touching the server-only data module.

/** Attempt with the (admin-only) device name embedded. */
export interface AttemptWithDevice extends VideoDownloadAttempt {
  device: { name: string } | null
}

/** The slice of fetch_jobs the Downloads page embeds per video. */
export type JobEmbed = Pick<
  FetchJob,
  | 'id'
  | 'status'
  | 'progress'
  | 'attempt_count'
  | 'max_devices'
  | 'bulk_import_item_id'
  | 'error_kind'
  | 'error_message'
  | 'claimed_at'
  | 'created_at'
  | 'finished_at'
> & {
  claimed_device: { name: string } | null
  bulk_item: { job_id: string } | null
}

/** One video row on the Downloads page, with everything embedded. */
export interface DownloadVideoRow {
  id: string
  title: string
  church_id: string
  status: VideoStatus
  error_message: string | null
  created_at: string
  updated_at: string | null
  churches: { name: string } | null | undefined
  video_download_attempts: AttemptWithDevice[]
  fetch_jobs: JobEmbed[]
}

/** One proxy-route attempt on the Fleet page's proxy stats panel. */
export interface ProxyAttempt {
  id: string
  outcome: 'in_progress' | 'succeeded' | 'failed'
  kind: DownloadFailureKind | null
  downloaded_bytes: number | null
  started_at: string
  finished_at: string | null
  video: { id: string; title: string } | null
}

/** One failed device attempt on the Fleet page's drill-in. */
export interface DeviceFailure {
  id: string
  device_id: string
  kind: DownloadFailureKind | null
  http_status: number | null
  error_message: string | null
  egress_ip: string | null
  started_at: string
  finished_at: string | null
  video: { id: string; title: string } | null
}

export type FetchDeviceStatus = 'active' | 'cooling' | 'offline' | 'disabled'

export interface FetchDevice {
  id: string
  name: string
  token_prefix: string
  enabled: boolean
  /** Display status maintained server-side; `enabled === false` should force "Disabled" in the UI. */
  status: FetchDeviceStatus
  cooldown_until: string | null
  last_seen_at: string | null
  last_job_finished_at: string | null
  consecutive_block_failures: number
  agent_version: string | null
  ytdlp_version: string | null
  last_ip: string | null
  disk_free_gb: number | null
  notes: string | null
  created_at: string
  updated_at: string | null
}

// ─── Bulk YouTube channel import ────────────────────────────────────

/**
 * Lifecycle of a bulk-import job. Mirrors ragserv's BulkImportJobStatus.
 *
 *   discovering        — yt-dlp listing the channel
 *   discovery_failed   — terminal; see `discovery_error`
 *   awaiting_review    — items inserted, staff to confirm
 *   queued             — staff hit Start; orchestrator dispatched
 *   running            — orchestrator mid-loop
 *   stopped            — manual /stop or consecutive-failure threshold
 *   completed          — orchestrator drained the queue
 */
export type BulkImportJobStatus =
  | 'discovering'
  | 'discovery_failed'
  | 'awaiting_review'
  | 'queued'
  | 'running'
  | 'stopped'
  | 'completed'

export type BulkImportItemOutcome =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped_duplicate'
  | 'skipped_unselected'
  | 'cancelled'

export interface BulkImportJobItem {
  id: string
  job_id: string
  position: number
  youtube_video_id: string
  youtube_url: string
  title: string | null
  duration_seconds: number | null
  upload_date: string | null
  week_anchor_sunday: string | null
  is_recommended: boolean
  is_selected: boolean
  assigned_ip_family: 'ipv4' | 'ipv6' | null
  outcome: BulkImportItemOutcome
  video_id: string | null
  existing_video_id: string | null
  failure_kind: DownloadFailureKind | null
  failure_message: string | null
  started_at: string | null
  finished_at: string | null
}

export interface BulkImportJob {
  id: string
  church_id: string
  created_by: string | null
  channel_url: string
  normalized_channel_url: string
  requested_count: number
  fetch_multiplier: number
  pacing_seconds: number
  consecutive_failure_threshold: number
  automatic: boolean
  force: boolean
  status: BulkImportJobStatus
  discovery_error: string | null
  consecutive_failures: number
  created_at: string
  updated_at: string
}

/** GET /bulk-imports/{id} returns this — job + items in one payload. */
export interface BulkImportJobDetail extends BulkImportJob {
  items: BulkImportJobItem[]
}

export interface BulkImportCreatePayload {
  channel_url: string
  requested_count?: number
  fetch_multiplier?: number
  pacing_seconds?: number
  consecutive_failure_threshold?: number
  automatic?: boolean
  force?: boolean
}

// ─── Web-page video import ──────────────────────────────────────────
//
// Mirrors ragserv's /page-imports endpoints. Stateless: discover scrapes
// a page and returns the videos found; queue creates + dispatches the
// selected ones through the fetch fleet. Progress is tracked on the
// Downloads dashboard, not here.

export type VideoPlatform = 'youtube' | 'vimeo'

export interface DiscoveredPageVideo {
  platform: VideoPlatform
  external_id: string
  /** Canonical URL to queue (what yt-dlp downloads). */
  url: string
  /** Anchor text when the video came from a link; null for embeds. */
  title: string | null
  already_imported: boolean
}

export interface DiscoveredPageChannel {
  platform: VideoPlatform
  /** Normalized channel URL — hand to bulk-import to enumerate. */
  url: string
  title: string | null
}

export interface PageDiscoverResult {
  page_url: string
  found_count: number
  /** Of found_count, how many are already imported for this church. */
  duplicate_count: number
  parse_error_count: number
  videos: DiscoveredPageVideo[]
  /** Channel links found on the page (e.g. the church's Vimeo channel) —
   * the robust path when individual videos load via JS. */
  channels: DiscoveredPageChannel[] | undefined
}

export interface QueuedVideoResult {
  url: string
  status: 'queued' | 'skipped_duplicate' | 'invalid'
  video_id: string | null
  route: string | null
}

export interface PageQueueResult {
  queued_count: number
  skipped_duplicate_count: number
  invalid_count: number
  results: QueuedVideoResult[]
}

// ─── Gardens ────────────────────────────────────────────────────────────────

export type GardenStatus =
  | 'pending'
  | 'generating'
  | 'reviewing'
  | 'ready'
  | 'error'

/** A single card inside a garden. Matches ragserv's GardenConfig + the
 *  parishioner UI's GardenCard union. */
export type GardenCard =
  | VerseGardenCard
  | TextGardenCard
  | QuestionGardenCard
  | MediaGardenCard
  | ReflectionFinalGardenCard

export interface BaseCard {
  id: string
  tag?: string
}

export interface VerseGardenCard extends BaseCard {
  type: 'verse'
  citation?: string
  content: string
  footerText?: string
}

export interface TextGardenCard extends BaseCard {
  type: 'text'
  content: string
}

export interface QuestionGardenCard extends BaseCard {
  type: 'reflection_mc'
  content: string
  options: string[]
}

export interface ReflectionFinalGardenCard extends BaseCard {
  type: 'reflection_final'
  content: string
  placeholder?: string
}

export interface MediaGardenCard extends BaseCard {
  type: 'media'
  url: string
  caption?: string
}

export interface GardenContent {
  // The DB row's `garden_date` is the canonical source for "which day
  // is this for"; `GardenContent` no longer echoes it back.
  topic: string
  title?: string
  push?: string
  cards: GardenCard[]
  final_reflection?: ReflectionFinalGardenCard
}

export interface Garden {
  id: string
  video_id: string
  church_id: string
  // ISO date (YYYY-MM-DD). Mon–Sat only; Sunday is rejected at the
  // DB layer (CHECK constraint). One garden per (church_id, garden_date).
  garden_date: string
  topic: string
  content_json: GardenContent | null
  status: GardenStatus
  error_message: string | null
  /** True when the week's primary video changed (or its transcript /
   *  secondary set) after these gardens were generated. Cleared on a
   *  successful regen. */
  is_stale: boolean
  is_featured: boolean
  created_at: string
  updated_at: string | null
}

/** List view includes content_json so we can show the AI-generated display title. */
export type GardenListItem = Garden

export interface UpdateGardenRequest {
  topic?: string
  content_json?: GardenContent
  is_featured?: boolean
}

// ─── Churches & profiles ────────────────────────────────────────────────────

export interface Church {
  id: string
  public_id: string | null
  name: string
  alias: string | null
  city: string | null
  state: string | null
  country: string
  contact_email: string | null
  contact_phone: string | null
  timezone: string
  ragie_partition_id: string | null
  logo_url: string | null
  /** Alternate logo variant — e.g. a wordmark to pair with a monogram,
   *  or a light-on-dark version for headers. Optional; falls back to
   *  ``logo_url`` when absent. */
  alt_logo_url: string | null
  image_url: string | null
  is_searchable: boolean
  created_at: string
  updated_at: string | null
}

export interface Pastor {
  id: string
  church_id: string
  profile_id: string | null
  name: string
  short_name: string | null
  title: string | null
  bio: string | null
  email: string | null
  avatar_url: string | null
  display_order: number
}

// ─── Documents & tags ───────────────────────────────────────────────────────

export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'error'
export type DocumentType = 'pdf' | 'text' | 'other'

export interface Document {
  id: string
  church_id: string
  created_by: string | null
  title: string
  content: string | null
  s3_key: string | null
  document_type: DocumentType
  ragie_document_id: string | null
  status: DocumentStatus
  error_message: string | null
  created_at: string
  updated_at: string | null
}

export interface Tag {
  id: string
  church_id: string
  name: string
  created_at: string
}

// ─── Themes ─────────────────────────────────────────────────────────────────

export interface Theme {
  id: string
  church_id: string
  name: string
  image_url: string | null
  display_order: number
  created_at: string
  updated_at: string | null
}

export interface VideoTheme {
  video_id: string
  theme_id: string
  // Set when the tag is clip-scoped (auto-promoted by ragserv from
  // a clip suggestion, or staff manually attached to a clip). NULL
  // for legacy/manual video-level tags.
  clip_id: string | null
  // LLM score frozen at confirmation time; auto-filled by a
  // BEFORE-INSERT trigger when clip_id is set and confidence
  // wasn't passed. NULL for manual video-level inserts.
  confidence: number | null
  // Provenance:
  //   - 'llm'    — ragserv auto-promoted this from a clip
  //                suggestion. Re-running the suggester will
  //                delete-and-replace these rows for the video.
  //   - 'manual' — staff inserted via pastor-ui (the default
  //                for PostgREST inserts that don't pass `source`).
  //                Sticky across suggester re-runs.
  source: 'llm' | 'manual'
  created_at: string
}

// ─── Clip-level theme suggestions (LLM, staff-only) ─────────────────────────
//
// Returned by ragserv `GET /videos/{id}/theme-suggestions`. The LLM
// segments each sermon by topic shift and emits per-clip themes with
// confidence. Pastor-UI surfaces these so staff can promote a clip's
// suggested theme into a confirmed `video_themes` row (with clip_id).

export interface ClipThemeSuggestion {
  theme_id: string
  theme_name: string
  confidence: number
}

export interface ClipSuggestion {
  clip_id: string
  start_time: number
  end_time: number
  summary: string | null
  suggested_at: string
  // Sorted by confidence desc on the server side. Empty array is a
  // possible value — the LLM emitted the clip but every theme fell
  // below the confidence floor; staff can still inspect the clip
  // span and tag it manually.
  themes: ClipThemeSuggestion[]
}
