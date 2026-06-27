/**
 * Route handler: POST /api/fetch/devices/{id}/{enable|disable}
 * (super-admin only)
 *
 * Proxies ragserv's device kill switch. Gated by requireAdmin() here
 * AND by ragserv's own super_admin check — belt and braces, same as
 * the rotate-worker-ip route.
 */

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/dal'
import { apiErrorResponse } from '@/lib/api/client'
import { disableFetchDevice, enableFetchDevice } from '@/lib/api/fetch'

const ACTIONS = {
  enable: enableFetchDevice,
  disable: disableFetchDevice,
} as const

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  await requireAdmin()
  const { id, action } = await params
  const handler = ACTIONS[action as keyof typeof ACTIONS]
  if (!handler) {
    return NextResponse.json(
      { error: `Unknown device action: ${action}` },
      { status: 400 },
    )
  }
  try {
    const device = await handler(id)
    return NextResponse.json(device)
  } catch (err) {
    const { status, body } = apiErrorResponse(err, `Failed to ${action} device`)
    return NextResponse.json(body, { status })
  }
}
