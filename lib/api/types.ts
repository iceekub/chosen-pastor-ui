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
  thumbnail_url: string | null
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
  created_at: string
}
