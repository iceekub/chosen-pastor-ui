import 'server-only'

import { SUPABASE_ANON_KEY, SUPABASE_URL, ApiError } from './client'
import type { SessionUser, UserRole } from './types'

/**
 * Sign in via Supabase Auth (password grant) and return the bits we
 * need for the session: tokens + a SessionUser shaped from the
 * matching `profiles` row.
 */
export async function loginWithCredentials(
  email: string,
  password: string,
): Promise<{
  accessToken: string
  refreshToken: string
  user: SessionUser
}> {
  const tokenRes = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    },
  )
  if (!tokenRes.ok) {
    const text = await tokenRes.text().catch(() => tokenRes.statusText)
    throw new ApiError(tokenRes.status, text)
  }
  const tok = await tokenRes.json()
  const accessToken: string = tok.access_token
  const refreshToken: string = tok.refresh_token

  // Load the corresponding profile row + church name to populate SessionUser.
  const profRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${tok.user.id}&select=id,name,role,church_id,church:churches(name)`,
    {
      cache: 'no-store',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.pgrst.object+json',
      },
    },
  )
  if (!profRes.ok) {
    const text = await profRes.text().catch(() => profRes.statusText)
    throw new ApiError(profRes.status, text)
  }
  const profile = await profRes.json()

  const user: SessionUser = {
    id: profile.id,
    name: profile.name,
    email: tok.user.email,
    role: profile.role as UserRole,
    church_id: profile.church_id,
    church_name: profile.church?.name ?? null,
  }

  return { accessToken, refreshToken, user }
}

export async function logoutSupabase(accessToken: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  })
}
