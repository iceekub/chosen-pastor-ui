/**
 * Route handler: GET /api/bulk-imports/{id}
 *
 * Returns the job detail (header + items) for the polling UI. ragserv
 * scopes by RLS so cross-church reads come back as 404.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getBulkImport } from '@/lib/api/bulkImports'
import { ApiError } from '@/lib/api/client'

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
    const job = await getBulkImport(id)
    return NextResponse.json(job)
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 502 })
  }
}
