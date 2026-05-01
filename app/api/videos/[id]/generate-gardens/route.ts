/**
 * Route handler: POST /api/videos/[id]/generate-gardens
 * Proxies to backend POST /videos/{id}/generate-gardens.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { generateGardens } from '@/lib/api/videos'

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
  const { week_starts_at, instructions } = body as {
    week_starts_at?: string
    instructions?: string
  }

  if (!week_starts_at) {
    return NextResponse.json(
      { error: 'week_starts_at is required (ISO date for the Monday of the week)' },
      { status: 400 },
    )
  }

  try {
    const gardens = await generateGardens(id, week_starts_at, instructions)
    return NextResponse.json(gardens, { status: 202 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate gardens'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
