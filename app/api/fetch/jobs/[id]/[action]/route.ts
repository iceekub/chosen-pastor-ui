/**
 * Route handler: POST /api/fetch/jobs/{id}/{retry|cancel} (staff)
 *
 * Proxies ragserv's fetch-job actions. ragserv scopes the job to the
 * caller's church and enforces valid state transitions — its 409s
 * ("Job is pending; only failed/cancelled jobs can be retried") are
 * forwarded intact so the button can show them.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { apiErrorResponse } from '@/lib/api/client'
import { cancelFetchJob, retryFetchJob } from '@/lib/api/fetch'

const ACTIONS = {
  retry: retryFetchJob,
  cancel: cancelFetchJob,
} as const

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id, action } = await params
  const handler = ACTIONS[action as keyof typeof ACTIONS]
  if (!handler) {
    return NextResponse.json(
      { error: `Unknown job action: ${action}` },
      { status: 400 },
    )
  }
  try {
    const job = await handler(id)
    return NextResponse.json(job)
  } catch (err) {
    const { status, body } = apiErrorResponse(err, `Failed to ${action} job`)
    return NextResponse.json(body, { status })
  }
}
