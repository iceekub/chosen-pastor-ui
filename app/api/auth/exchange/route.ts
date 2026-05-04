/**
 * POST /api/auth/exchange
 *
 * Take a Supabase access + refresh token (obtained client-side, e.g.
 * from a magic-link invite) and bake them into the server-side
 * session cookie. After this, server components / actions can call
 * the API with the user's identity.
 */

import { NextRequest, NextResponse } from 'next/server'
import { setSession } from '@/lib/session'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/api/client'

export async function POST(request: NextRequest) {
  const { access_token, refresh_token } = (await request.json()) as {
    access_token?: string
    refresh_token?: string
  }
  if (!access_token || !refresh_token) {
    return NextResponse.json(
      { error: 'access_token + refresh_token required' },
      { status: 400 },
    )
  }

  // Look up the user (and their profile) using the just-issued token.
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${access_token}`,
    },
    cache: 'no-store',
  })
  if (!userRes.ok) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
  const u = await userRes.json()

  const profRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${u.id}&select=id,name,role,church_id,church:churches(name)`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/vnd.pgrst.object+json',
      },
      cache: 'no-store',
    },
  )
  if (!profRes.ok) {
    return NextResponse.json({ error: 'No profile' }, { status: 403 })
  }
  const profile = await profRes.json()

  await setSession({
    accessToken: access_token,
    refreshToken: refresh_token,
    user: {
      id: profile.id,
      name: profile.name,
      email: u.email ?? '',
      role: profile.role,
      church_id: profile.church_id,
      church_name: profile.church?.name ?? null,
    },
  })
  return NextResponse.json({ ok: true })
}
