/**
 * Route handler: POST /api/bulk-imports + GET /api/bulk-imports
 *
 * POST kicks off discovery. The body mirrors ragserv's
 * `BulkImportCreate` schema; only `channel_url` is required.
 *
 * GET lists jobs scoped to the caller's church. Optional
 * `?status=active` (or any other status string) filter is forwarded.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createBulkImport, listBulkImports } from '@/lib/api/bulkImports'
import { ApiError } from '@/lib/api/client'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const channelUrl = (body as { channel_url?: string }).channel_url
  if (!channelUrl) {
    return NextResponse.json(
      { error: 'channel_url is required' },
      { status: 400 },
    )
  }

  try {
    const job = await createBulkImport(body)
    return NextResponse.json(job, { status: 201 })
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    const message = err instanceof Error ? err.message : 'Failed to create job'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const statusFilter = request.nextUrl.searchParams.get('status') ?? undefined
  try {
    const jobs = await listBulkImports(statusFilter)
    return NextResponse.json(jobs)
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Failed to list jobs' }, { status: 502 })
  }
}
