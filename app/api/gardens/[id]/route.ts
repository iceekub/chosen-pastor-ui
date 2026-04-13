/**
 * Route handler: PUT /api/gardens/[id]
 * Proxies to backend PUT /gardens/{id} — updates garden content.
 *
 * Note: the backend may not have this endpoint yet. If it returns 404/405,
 * we return a helpful error. Once the backend adds PUT /gardens/{id}, this
 * will work automatically.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { updateGarden } from '@/lib/api/garden'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  try {
    const garden = await updateGarden(id, body)
    return NextResponse.json(garden)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update garden'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
