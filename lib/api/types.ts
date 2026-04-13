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

export type GardenStatus = 'pending' | 'generating' | 'ready' | 'error'

export interface Garden {
  id: string
  video_id: string
  church_id: string
  day_number: number
  topic: string
  content_markdown: string | null
  status: GardenStatus
  error_message: string | null
  created_at: string
  updated_at: string | null
}

/** Subset returned by list endpoints (no content_markdown) */
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
  content_markdown?: string
}

/** Request to create a garden manually (not via AI generation) */
export interface CreateGardenRequest {
  video_id?: string
  day_number: number
  topic: string
  content_markdown?: string
}

// ─── Churches ────────────────────────────────────────────────────────────────

export interface Church {
  id: string
  name: string
  ragie_partition_id: string | null
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
