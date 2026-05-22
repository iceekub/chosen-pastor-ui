/**
 * Route handler: POST /api/admin/rotate-worker-ip (super-admin only)
 *
 * Proxies to ragserv's POST /infra/rotate-worker-ip, which calls
 * ecs:UpdateService(forceNewDeployment=true) on the Celery worker
 * service. A new task spins up in ~60–90s with a new public IP
 * (and a new v6 from the subnet's /64 if v6 is enabled).
 *
 * Server-side gated by requireAdmin() so the privileged button on
 * /admin/diagnostics is admin-only at both the Next and ragserv
 * layers.
 */

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/dal'
import { rotateWorkerIp } from '@/lib/api/videos'

export async function POST() {
  await requireAdmin()
  try {
    const result = await rotateWorkerIp()
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to rotate IP'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
