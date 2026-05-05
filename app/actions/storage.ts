'use server'

/**
 * Server actions for uploading images to Supabase Storage.
 *
 * Bucket layout (all public-read, staff-write scoped to church_id prefix):
 *   church-logos   → <church_id>/logo.<ext>
 *   church-images  → <church_id>/hero.<ext>
 *   garden-images  → <church_id>/<garden_id>/cover.<ext>
 *                    <church_id>/<garden_id>/background.<ext>
 *   garden-media   → <church_id>/<garden_id>/<card_id>.<ext>
 */

import { verifySession } from '@/lib/dal'
import { uploadToStorage } from '@/lib/api/storage'
import { postgrest } from '@/lib/api/client'
import { updatePastor } from '@/lib/api/pastors'

export type UploadResult = {
  error?: string
  success?: boolean
  url?: string
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

function getExt(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase()
  return ext && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg'
}

function validateFile(file: unknown): file is File {
  if (!(file instanceof File)) return false
  if (file.size === 0 || file.size > MAX_BYTES) return false
  if (!ALLOWED_TYPES.includes(file.type)) return false
  return true
}

/* ── Church logo ──────────────────────────────────────────── */

export async function uploadChurchLogoAction(
  formData: FormData,
): Promise<UploadResult> {
  const user = await verifySession()
  if (!user.church_id) return { error: 'No church associated with your account.' }

  const file = formData.get('file')
  if (!validateFile(file)) return { error: 'Please select a JPEG, PNG, or WebP image under 10 MB.' }

  const path = `${user.church_id}/logo.${getExt(file)}`
  try {
    const url = await uploadToStorage('church-logos', path, file)
    await postgrest(`/churches?id=eq.${user.church_id}`, {
      method: 'PATCH',
      body: { logo_url: url },
    })
    return { success: true, url }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Upload failed' }
  }
}

/* ── Church search logo ───────────────────────────────────── */

export async function uploadChurchSearchLogoAction(
  formData: FormData,
): Promise<UploadResult> {
  const user = await verifySession()
  if (!user.church_id) return { error: 'No church associated with your account.' }

  const file = formData.get('file')
  if (!validateFile(file)) return { error: 'Please select a JPEG, PNG, or WebP image under 10 MB.' }

  const path = `${user.church_id}/logo-search.${getExt(file)}`
  try {
    const url = await uploadToStorage('church-logos', path, file)
    await postgrest(`/churches?id=eq.${user.church_id}`, {
      method: 'PATCH',
      body: { logo_search_url: url },
    })
    return { success: true, url }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Upload failed' }
  }
}

/* ── Church alt logo ──────────────────────────────────────── */

export async function uploadChurchAltLogoAction(
  formData: FormData,
): Promise<UploadResult> {
  const user = await verifySession()
  if (!user.church_id) return { error: 'No church associated with your account.' }

  const file = formData.get('file')
  if (!validateFile(file)) return { error: 'Please select a JPEG, PNG, or WebP image under 10 MB.' }

  const path = `${user.church_id}/logo-alt.${getExt(file)}`
  try {
    const url = await uploadToStorage('church-logos', path, file)
    await postgrest(`/churches?id=eq.${user.church_id}`, {
      method: 'PATCH',
      body: { alt_logo_url: url },
    })
    return { success: true, url }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Upload failed' }
  }
}

/* ── Church hero image ────────────────────────────────────── */

export async function uploadChurchImageAction(
  formData: FormData,
): Promise<UploadResult> {
  const user = await verifySession()
  if (!user.church_id) return { error: 'No church associated with your account.' }

  const file = formData.get('file')
  if (!validateFile(file)) return { error: 'Please select a JPEG, PNG, or WebP image under 10 MB.' }

  const path = `${user.church_id}/hero.${getExt(file)}`
  try {
    const url = await uploadToStorage('church-images', path, file)
    await postgrest(`/churches?id=eq.${user.church_id}`, {
      method: 'PATCH',
      body: { image_url: url },
    })
    return { success: true, url }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Upload failed' }
  }
}

/* ── Garden media card image ──────────────────────────────── */

/**
 * gardenId is pre-bound at the server component level.
 * cardId is bound from the client (safe — it's just a slug, not sensitive).
 */
export async function uploadGardenMediaCardAction(
  gardenId: string,
  cardId: string,
  formData: FormData,
): Promise<UploadResult> {
  const user = await verifySession()
  if (!user.church_id) return { error: 'No church associated with your account.' }

  const file = formData.get('file')
  if (!validateFile(file)) return { error: 'Please select a JPEG, PNG, or WebP image under 10 MB.' }

  const path = `${user.church_id}/${gardenId}/${cardId}.${getExt(file)}`
  try {
    const url = await uploadToStorage('garden-media', path, file)
    return { success: true, url }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Upload failed' }
  }
}

/* ── Video thumbnail ──────────────────────────────────────── */

/**
 * videoId is pre-bound at call site via .bind():
 *   const action = uploadVideoThumbnailAction.bind(null, video.id)
 *
 * Requires a `video-thumbnails` Supabase Storage bucket (public-read,
 * staff-write scoped to church_id prefix).
 */
export async function uploadVideoThumbnailAction(
  videoId: string,
  formData: FormData,
): Promise<UploadResult> {
  const user = await verifySession()
  if (!user.church_id) return { error: 'No church associated with your account.' }

  const file = formData.get('file')
  if (!validateFile(file)) return { error: 'Please select a JPEG, PNG, or WebP image under 10 MB.' }

  const path = `${user.church_id}/${videoId}/thumbnail.${getExt(file)}`
  try {
    const url = await uploadToStorage('video-thumbnails', path, file)
    await postgrest(`/videos?id=eq.${videoId}`, {
      method: 'PATCH',
      body: { thumbnail_url: url },
    })
    return { success: true, url }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Upload failed' }
  }
}

/* ── Pastor avatar ────────────────────────────────────────── */

/**
 * pastorId is pre-bound at call site via .bind():
 *   const action = uploadPastorAvatarAction.bind(null, pastor.id)
 */
export async function uploadPastorAvatarAction(
  pastorId: string,
  formData: FormData,
): Promise<UploadResult> {
  const user = await verifySession()
  if (!user.church_id) return { error: 'No church associated with your account.' }

  const file = formData.get('file')
  if (!validateFile(file)) return { error: 'Please select a JPEG, PNG, or WebP image under 10 MB.' }

  const path = `${user.church_id}/${pastorId}.${getExt(file)}`
  try {
    const url = await uploadToStorage('pastor-avatars', path, file)
    await updatePastor(pastorId, { avatar_url: url })
    return { success: true, url }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Upload failed' }
  }
}
