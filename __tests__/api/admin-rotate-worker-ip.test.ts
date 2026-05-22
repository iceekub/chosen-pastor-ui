vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/dal', () => ({ requireAdmin: vi.fn() }))
vi.mock('@/lib/api/videos', () => ({ rotateWorkerIp: vi.fn() }))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireAdmin } from '@/lib/dal'
import { rotateWorkerIp } from '@/lib/api/videos'
import { POST } from '@/app/api/admin/rotate-worker-ip/route'

const mockRequireAdmin = requireAdmin as ReturnType<typeof vi.fn>
const mockRotate = rotateWorkerIp as ReturnType<typeof vi.fn>

beforeEach(() => vi.clearAllMocks())

describe('POST /api/admin/rotate-worker-ip', () => {
  it('proxies to ragserv on success', async () => {
    mockRequireAdmin.mockResolvedValue({
      id: 'u1',
      role: 'super_admin',
      church_id: null,
      church_name: null,
      name: 'A',
      email: 'a@a',
    })
    mockRotate.mockResolvedValue({
      deployment_id: 'ecs-svc/abc',
      service: 'chosen-worker',
    })
    const res = await POST()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      deployment_id: 'ecs-svc/abc',
      service: 'chosen-worker',
    })
  })

  it('returns 502 on ragserv error', async () => {
    mockRequireAdmin.mockResolvedValue({
      id: 'u1',
      role: 'super_admin',
      church_id: null,
      church_name: null,
      name: 'A',
      email: 'a@a',
    })
    mockRotate.mockRejectedValue(new Error('boom'))
    const res = await POST()
    expect(res.status).toBe(502)
  })
})
