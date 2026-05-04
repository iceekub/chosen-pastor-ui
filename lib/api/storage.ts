/**
 * Server-side Supabase Storage upload helper.
 *
 * Uses the session's Supabase access token so that RLS policies on the
 * storage buckets (staff-write scoped to church_id prefix) are enforced.
 */

import 'server-only'

import { getSession } from '@/lib/session'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './client'

/**
 * Upload a file to a Supabase Storage bucket at the given path.
 * Upserts (overwrites) if a file already exists at that path.
 * Returns the public URL of the uploaded object.
 */
export async function uploadToStorage(
  bucket: string,
  path: string,
  file: File,
): Promise<string> {
  const session = await getSession()

  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.accessToken ?? ''}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': file.type || 'image/jpeg',
        'x-upsert': 'true',
      },
      // File extends Blob; Node 18+ fetch accepts Blob as body
      body: file,
    },
  )

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(`Storage upload failed (${res.status}): ${msg}`)
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
}
