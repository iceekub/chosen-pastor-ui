/**
 * Route handler: POST /api/deletion-requests/[id]/process
 * Proxies a staff approve/reject to the `account-deletion-process` Edge
 * Function (which holds the service role and does the actual account
 * deletion). Forwards the session bearer; the Edge Function enforces the
 * staff role + church scope and returns structured 4xx/409 codes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { processDeletionRequest } from '@/lib/api/deletionRequests'
import { ApiError } from '@/lib/api/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as {
    action?: string
    notes?: string
  }
  if (body.action !== 'approve' && body.action !== 'reject') {
    return NextResponse.json(
      { error: 'action must be "approve" or "reject"' },
      { status: 400 },
    )
  }

  try {
    const updated = await processDeletionRequest(id, body.action, body.notes)
    return NextResponse.json(updated)
  } catch (err) {
    // Forward the Edge Function's JSON body + status verbatim so the client
    // keeps any structured fields (e.g. code: 'already_processed').
    if (err instanceof ApiError) {
      let parsed: unknown
      try {
        parsed = JSON.parse(err.message)
      } catch {
        parsed = { error: err.message }
      }
      return NextResponse.json(parsed, { status: err.status })
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to process deletion request' },
      { status: 502 },
    )
  }
}
