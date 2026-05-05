/**
 * Types matching the Chosen schema (Supabase Postgres) + ragserv responses.
 * Mirror of `backend/supabase/migrations/20260425000001_init.sql`.
 */

export type UserRole = 'super_admin' | 'pastor' | 'staff' | 'parishioner'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: UserRole
  church_id: string | null
  church_name: string | null
}

// ─── Videos (sermons) ───────────────────────────────────────────────────────

export type VideoStatus =
  | 'pending_upload'
  | 'downloading'
  | 'uploaded'
  | 'processing'
  | 'ready'
  | 'error'

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
  preached_at: string | null
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
  | 'preached_at'
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
  day_number: number
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
  day_number: number
  topic: string
  content_json: GardenContent | null
  status: GardenStatus
  error_message: string | null
  go_live_date: string | null
  is_featured: boolean
  created_at: string
  updated_at: string | null
}

export type GardenListItem = Omit<Garden, 'content_json'>

export interface UpdateGardenRequest {
  topic?: string
  content_json?: GardenContent
  go_live_date?: string | null
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
  created_at: string
}
