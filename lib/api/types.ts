/**
 * Shared types derived from the Chosen DB schema.
 * Update these as the real API contract is finalized.
 */

export type UserRole = 'admin' | 'pastor' | 'church_staff' | 'congregant'

export interface SessionUser {
  id: number
  name: string
  email: string
  role: UserRole
  congregation_id: number
  congregation_name: string
}

export interface LoginResponse {
  token: string
  user: SessionUser
}

// ─── Sermons / Videos ─────────────────────────────────────────────────────────

export type VideoState = 0 | 1 | 2 | 3 // 0=waiting, 1=uploaded, 2=processing, 3=valid

export interface Sermon {
  id: number
  title: string
  base_file_name: string
  length: number | null // seconds
  state: VideoState
  created_at: string
  tags: Tag[]
  thumbnail_url?: string
}

export interface PresignedUploadResponse {
  upload_url: string  // The pre-signed S3 PUT URL
  key: string         // S3 object key — send back on completion
  sermon_id: number   // ID created server-side, ready to track state
}

export interface CompleteUploadRequest {
  sermon_id: number
  key: string
  title: string
  tag_ids?: number[]
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export interface Tag {
  id: number
  name: string
}

// ─── Documents ────────────────────────────────────────────────────────────────

export interface Document {
  id: number
  title: string
  content?: string
  created_at: string
}

// ─── Garden ───────────────────────────────────────────────────────────────────

export type CardType = 1 | 2 | 3 | 4 // 1=text, 2=image, 3=video, 4=question

export interface Garden {
  id: number
  title: string
  description?: string
  go_live_date: string | null
  image?: string
  status: 'draft' | 'pending_approval' | 'approved' | 'live'
  cards: Card[]
}

export interface Card {
  id: number
  garden_id: number
  card_type: CardType
  content: string
  image?: string
  video?: string
  position: number
}

export interface CreateGardenRequest {
  date?: string
  title: string
  subtitle?: string
}

export interface CreateCardRequest {
  position?: number
  title: string
  card_type: CardType
  text: string
  image?: string
  choices?: string[] // for poll cards
}

export interface UpdateCardRequest {
  title?: string
  text?: string
  image?: string
  choices?: string[]
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface Congregation {
  id: number
  name: string
  city?: string
  state?: string
  country: string
}
