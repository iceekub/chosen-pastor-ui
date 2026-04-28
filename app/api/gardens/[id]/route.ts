/**
 * Route handler: PUT /api/gardens/[id]
 *
 * The backend does not yet expose a PUT /gardens/{id} endpoint.
 * This stub returns 501 Not Implemented so callers get a clear error
 * rather than a silent failure. Re-implement once the backend adds the
 * endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function PUT(
  _request: NextRequest,
  _context: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json(
    { error: 'Garden editing is not yet supported by the backend.' },
    { status: 501 },
  )
}
