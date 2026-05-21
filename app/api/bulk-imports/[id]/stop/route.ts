/**
 * Route handler: POST /api/bulk-imports/{id}/stop
 *
 * Flips the job to `stopped`. Orchestrator finishes its current item
 * (cannot abort an in-flight yt-dlp call) then exits; pending items
 * get cancelled. 409 if already terminal.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { stopBulkImport } from '@/lib/api/bulkImports'
import { ApiError } from '@/lib/api/client'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    const job = await stopBulkImport(id)
    return NextResponse.json(job)
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Failed to stop job' }, { status: 502 })
  }
}
