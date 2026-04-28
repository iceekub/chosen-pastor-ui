/**
 * Types matching the Chosen backend API schemas.
 */

export type UserRole = 'admin' | 'pastor' | 'church_staff' | 'congregant'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: UserRole
  congregation_id: string
  congregation_name: string
}

export interface LoginResponse {
  token: string
  user: SessionUser
}

// ─── Videos ──────────────────────────────────────────────────────────────────

export type VideoStatus = 'pending_upload' | 'downloading' | 'uploaded' | 'processing' | 'ready' | 'error'

export interface Video {
  id: string
  church_id: string
  title: string
  description: string | null
  video_type: string
  s3_key: string | null
  status: VideoStatus
  ragie_document_id: string | null
  transcript: string | null
  error_message: string | null
  created_at: string
  updated_at: string | null
}

/** Subset returned by GET /videos (list endpoint) */
export interface VideoListItem {
  id: string
  church_id: string
  title: string
  description: string | null
  video_type: string
  status: VideoStatus
  created_at: string
  updated_at: string | null
}

/** Returned by POST /videos (includes presigned upload URL) */
export interface VideoCreateResponse extends Video {
  presigned_upload_url: string
}

// ─── Gardens ─────────────────────────────────────────────────────────────────

export type GardenStatus = 'pending' | 'generating' | 'reviewing' | 'ready' | 'error'

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

// ─── Tags (may be re-added later) ───────────────────────────────────────────

export interface Tag {
  id: number
  name: string
}

// ─── Documents ───────────────────────────────────────────────────────────────

export interface Document {
  id: string
  title: string
  content?: string
  created_at: string
}
