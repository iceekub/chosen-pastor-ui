/**
 * Route handler: GET /api/videos/[id]
 * Proxies to backend GET /videos/{id} — used for client-side status polling.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getVideo } from '@/lib/api/videos'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const video = await getVideo(id)
    return NextResponse.json(video)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch video'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
