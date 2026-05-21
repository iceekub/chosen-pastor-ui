/**
 * Route handler: GET /api/videos/[id]/download-attempts
 *
 * Server-side PostgREST read of ``video_download_attempts`` rows for
 * the given video. RLS limits visibility to the same-church staff and
 * super-admins; the diagnostics panel client-side fetches from here.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getVideoDownloadAttempts } from '@/lib/api/videos'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const rows = await getVideoDownloadAttempts(id)
    return NextResponse.json(rows)
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to fetch download attempts'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
