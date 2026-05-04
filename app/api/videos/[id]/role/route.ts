/**
 * Route handler: PATCH /api/videos/[id]/role
 *
 * Proxies to ragserv's PATCH /videos/{id} (which consolidates role +
 * video_date transitions and enforces the one-primary-per-week
 * invariant). Body shape matches what ragserv expects:
 *   { role?: 'primary' | 'secondary' | 'ignored', video_date?: string }
 *
 * The dedicated subroute lets the UI use a clear endpoint name and
 * keeps the GET /api/videos/[id] handler from growing a method
 * switch. The 409 returned by ragserv when a primary-uniqueness race
 * is lost is forwarded as-is so the UI can surface a refresh prompt.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { setVideoRole } from '@/lib/api/videos'
import type { VideoRole } from '@/lib/api/types'

const ROLES: ReadonlySet<VideoRole> = new Set(['primary', 'secondary', 'ignored'])

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const { role, video_date } = body as { role?: string; video_date?: string }

  if (role !== undefined && !ROLES.has(role as VideoRole)) {
    return NextResponse.json(
      { error: `role must be one of ${[...ROLES].join(', ')}` },
      { status: 400 },
    )
  }

  try {
    const updated = await setVideoRole(id, role as VideoRole, video_date)
    return NextResponse.json(updated)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update role'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
