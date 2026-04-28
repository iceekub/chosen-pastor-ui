/**
 * Route handler: GET /api/videos/[id]/gardens
 * Proxies to backend GET /gardens?video_id={id}
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { listGardens } from '@/lib/api/garden'

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
    const gardens = await listGardens(id)
    return NextResponse.json(gardens)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch gardens'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
