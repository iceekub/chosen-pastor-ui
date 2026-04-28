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

// ── Garden card types (content_json structure) ───────────────────────────────

interface BaseCard {
  id: string
  tag: string
  content: string
}

export interface VerseCard extends BaseCard {
  type: 'verse'
  citation?: string | null
  footerText?: string | null
}

export interface TextCard extends BaseCard {
  type: 'text'
}

export interface ReflectionMCCard extends BaseCard {
  type: 'reflection_mc'
  options: string[]
}

export interface MediaCard extends BaseCard {
  type: 'media'
  mediaUrl: string
}

export interface ReflectionFinalCard extends BaseCard {
  type: 'reflection_final'
  placeholder?: string | null
}

export type GardenCard = VerseCard | TextCard | ReflectionMCCard | MediaCard

// Keep legacy aliases for components that use the old names
export type VerseGardenCard = VerseCard
export type TextGardenCard = TextCard
export type QuestionGardenCard = ReflectionMCCard
export type MediaGardenCard = MediaCard
export type ReflectionFinalGardenCard = ReflectionFinalCard

/** Structured content stored in gardens.content_json */
export interface GardenContent {
  day_number: number
  topic: string
  title: string
  push: string
  cards: GardenCard[]
  final_reflection: ReflectionFinalCard
  repeat_source?: boolean | null
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

/** Subset returned by list endpoints (no content_json) */
export interface GardenListItem {
  id: string
  video_id: string
  church_id: string
  day_number: number
  topic: string
  status: GardenStatus
  error_message: string | null
  created_at: string
  updated_at: string | null
}

/** Request to update a garden's content */
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
