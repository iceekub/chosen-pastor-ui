vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/api/deletionRequests', () => ({ processDeletionRequest: vi.fn() }))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { processDeletionRequest } from '@/lib/api/deletionRequests'
import { ApiError } from '@/lib/api/client'
import { POST } from '@/app/api/deletion-requests/[id]/process/route'
import { makeDeletionRequest } from '../factories'

const mockGetSession = vi.mocked(getSession)
const mockProcess = vi.mocked(processDeletionRequest)

const validSession = {
  accessToken: 'access-token-test',
  refreshToken: 'refresh-token-test',
  user: { id: '1', name: 'Test', email: 't@t', role: 'staff' as const, church_id: 'c1', church_name: 'Demo' },
}

function makePost(id: string, body?: object) {
  return {
    req: new NextRequest(`http://localhost/api/deletion-requests/${id}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    }),
    ctx: { params: Promise.resolve({ id }) },
  }
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/deletion-requests/[id]/process', () => {
  it('returns 401 when there is no session', async () => {
    mockGetSession.mockResolvedValue(null)
    const { req, ctx } = makePost('dr-1', { action: 'approve' })
    const res = await POST(req, ctx)
    expect(res.status).toBe(401)
    expect(mockProcess).not.toHaveBeenCalled()
  })

  it('rejects a missing/invalid action with 400 before hitting the backend', async () => {
    mockGetSession.mockResolvedValue(validSession)
    const { req, ctx } = makePost('dr-1', { action: 'bogus' })
    const res = await POST(req, ctx)
    expect(res.status).toBe(400)
    expect(mockProcess).not.toHaveBeenCalled()
  })

  it('forwards an approve and returns the updated row', async () => {
    mockGetSession.mockResolvedValue(validSession)
    const updated = makeDeletionRequest({ id: 'dr-1', status: 'completed' })
    mockProcess.mockResolvedValue(updated)

    const { req, ctx } = makePost('dr-1', { action: 'approve' })
    const res = await POST(req, ctx)
    expect(res.status).toBe(200)
    expect(mockProcess).toHaveBeenCalledWith('dr-1', 'approve', undefined)
    const body = await res.json()
    expect(body.status).toBe('completed')
  })

  it('forwards a reject with notes', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockProcess.mockResolvedValue(makeDeletionRequest({ id: 'dr-1', status: 'rejected' }))

    const { req, ctx } = makePost('dr-1', { action: 'reject', notes: 'not the account owner' })
    await POST(req, ctx)
    expect(mockProcess).toHaveBeenCalledWith('dr-1', 'reject', 'not the account owner')
  })

  it('forwards the edge function status + structured code (e.g. already_processed)', async () => {
    mockGetSession.mockResolvedValue(validSession)
    mockProcess.mockRejectedValue(
      new ApiError(409, JSON.stringify({ error: 'Request already completed', code: 'already_processed' })),
    )

    const { req, ctx } = makePost('dr-1', { action: 'approve' })
    const res = await POST(req, ctx)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('already_processed')
    expect(body.error).toBe('Request already completed')
  })
})
