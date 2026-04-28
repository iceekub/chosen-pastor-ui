/**
 * Route handler: POST /api/videos/[id]/generate-gardens
 * Proxies to backend POST /gardens/generate { video_id, instructions? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { generateGardens } from '@/lib/api/garden'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const { instructions } = body as { instructions?: string }

  try {
    const gardens = await generateGardens(id, instructions)
    return NextResponse.json(gardens, { status: 202 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate gardens'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
