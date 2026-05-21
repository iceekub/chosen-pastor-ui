/**
 * Route handler: POST /api/bulk-imports/{id}/start
 *
 * Body: { selected_item_ids: string[] }
 *
 * Confirms the user's selections from the review screen and queues
 * the orchestrator. ragserv returns 409 if the job isn't currently
 * `awaiting_review`; we surface that status through.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { startBulkImport } from '@/lib/api/bulkImports'
import { ApiError } from '@/lib/api/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const selected = (body as { selected_item_ids?: string[] }).selected_item_ids ?? []
  if (!Array.isArray(selected)) {
    return NextResponse.json(
      { error: 'selected_item_ids must be an array' },
      { status: 400 },
    )
  }

  try {
    const job = await startBulkImport(id, selected)
    return NextResponse.json(job)
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Failed to start job' }, { status: 502 })
  }
}
