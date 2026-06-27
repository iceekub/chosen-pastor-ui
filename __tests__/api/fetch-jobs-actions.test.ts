/**
 * POST /api/fetch/jobs/[id]/[action] — staff retry/cancel proxy.
 * ragserv enforces church scoping + state transitions; its structured
 * 409s must reach the client intact.
 */

vi.mock('server-only', () => ({}))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/api/fetch', () => ({
  retryFetchJob: vi.fn(),
  cancelFetchJob: vi.fn(),
}))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { ApiError } from '@/lib/api/client'
import { cancelFetchJob, retryFetchJob } from '@/lib/api/fetch'
import { POST } from '@/app/api/fetch/jobs/[id]/[action]/route'

const mockGetSession = getSession as ReturnType<typeof vi.fn>
const mockRetry = retryFetchJob as ReturnType<typeof vi.fn>
const mockCancel = cancelFetchJob as ReturnType<typeof vi.fn>

const session = {
  user: { id: 'u1', role: 'pastor', church_id: 'c1' },
  accessToken: 't',
  refreshToken: 'r',
}

function call(action: string) {
  return POST(new NextRequest('http://localhost', { method: 'POST' }), {
    params: Promise.resolve({ id: 'job-1', action }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetSession.mockResolvedValue(session)
})

describe('POST /api/fetch/jobs/[id]/[action]', () => {
  it('401 with no session', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await call('retry')
    expect(res.status).toBe(401)
    expect(mockRetry).not.toHaveBeenCalled()
  })

  it('retry delegates and returns the job', async () => {
    mockRetry.mockResolvedValue({ id: 'job-1', status: 'pending' })
    const res = await call('retry')
    expect(res.status).toBe(200)
    expect(mockRetry).toHaveBeenCalledWith('job-1')
    expect((await res.json()).status).toBe('pending')
  })

  it('cancel delegates too', async () => {
    mockCancel.mockResolvedValue({ id: 'job-1', status: 'cancelled' })
    const res = await call('cancel')
    expect(res.status).toBe(200)
    expect(mockCancel).toHaveBeenCalledWith('job-1')
  })

  it('unknown action → 400', async () => {
    const res = await call('promote')
    expect(res.status).toBe(400)
  })

  it("forwards ragserv's 409 state-transition errors intact", async () => {
    mockRetry.mockRejectedValue(
      new ApiError(
        409,
        JSON.stringify({
          detail: 'Job is pending; only failed/cancelled jobs can be retried',
        }),
      ),
    )
    const res = await call('retry')
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/only failed\/cancelled/)
  })

  it('network failure → 502', async () => {
    mockRetry.mockRejectedValue(new Error('socket hang up'))
    const res = await call('retry')
    expect(res.status).toBe(502)
  })
})
