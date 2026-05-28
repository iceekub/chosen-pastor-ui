/**
 * Tests for `createChurchAction`. The action runs in a server context;
 * we mock the DAL guard, the underlying `createChurch` (Edge Function
 * client), and verify it surfaces the Edge Function's JSON `{error}`
 * body so super-admins see why a create failed (Ragie partition
 * unreachable, env var missing, etc.) instead of a generic "Failed".
 */

vi.mock('server-only', () => ({}))
vi.mock('@/lib/dal', () => ({ requireAdmin: vi.fn() }))
vi.mock('@/lib/session', () => ({
  setEmulatedChurch: vi.fn(),
  clearEmulatedChurch: vi.fn(),
}))
vi.mock('@/lib/api/admin', () => ({
  createChurch: vi.fn(),
  inviteToChurch: vi.fn(),
}))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireAdmin } from '@/lib/dal'
import { createChurch } from '@/lib/api/admin'
import { ApiError } from '@/lib/api/client'
import { createChurchAction } from '@/app/actions/admin'

const mockRequireAdmin = vi.mocked(requireAdmin)
const mockCreateChurch = vi.mocked(createChurch)

const adminUser = {
  id: 'u1',
  name: 'Super',
  email: 'su@example.com',
  role: 'super_admin' as const,
  church_id: null,
  church_name: null,
}

function buildForm(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData()
  const defaults: Record<string, string> = {
    name: 'New Parish',
    city: 'Nashville',
    state: 'TN',
    timezone: 'America/Chicago',
    contact_email: '',
    admin_email: '',
    ...overrides,
  }
  for (const [k, v] of Object.entries(defaults)) {
    fd.set(k, v)
  }
  return fd
}

beforeEach(() => {
  mockRequireAdmin.mockReset()
  mockCreateChurch.mockReset()
  mockRequireAdmin.mockResolvedValue(adminUser)
})

describe('createChurchAction', () => {
  it('returns success with the church name on the happy path', async () => {
    mockCreateChurch.mockResolvedValue({
      id: 'c1',
      name: 'New Parish',
    } as never)

    const result = await createChurchAction(null, buildForm())
    expect(result).toEqual({ success: true, name: 'New Parish' })
    expect(mockCreateChurch).toHaveBeenCalledWith({
      name: 'New Parish',
      city: 'Nashville',
      state: 'TN',
      timezone: 'America/Chicago',
      contact_email: undefined,
      admin_email: undefined,
    })
  })

  it('forwards admin_email when provided', async () => {
    mockCreateChurch.mockResolvedValue({
      id: 'c1',
      name: 'New Parish',
    } as never)

    await createChurchAction(
      null,
      buildForm({ admin_email: 'pastor@example.com' }),
    )
    expect(mockCreateChurch).toHaveBeenCalledWith(
      expect.objectContaining({ admin_email: 'pastor@example.com' }),
    )
  })

  it('threads invite_warning into the result as warning', async () => {
    // Edge Function returns the church row with an invite_warning
    // field when the church was created but the first-admin magic-
    // link couldn't be sent.
    mockCreateChurch.mockResolvedValue({
      id: 'c1',
      name: 'New Parish',
      invite_warning: 'Invite to pastor@example.com failed: already registered',
    } as never)

    const result = await createChurchAction(
      null,
      buildForm({ admin_email: 'pastor@example.com' }),
    )
    expect(result).toEqual({
      success: true,
      name: 'New Parish',
      warning: 'Invite to pastor@example.com failed: already registered',
    })
  })

  it('extracts the JSON `error` field when the Edge Function returns a structured failure', async () => {
    // Mirrors what `churches-onboard` returns on Ragie failure now
    // that partition provisioning is mandatory.
    mockCreateChurch.mockRejectedValue(
      new ApiError(
        502,
        JSON.stringify({ error: 'Ragie partition creation failed (500): Internal' }),
      ),
    )

    const result = await createChurchAction(null, buildForm())
    expect(result).toEqual({
      error: 'Ragie partition creation failed (500): Internal',
    })
  })

  it('falls back to the raw message when ApiError body is not JSON', async () => {
    mockCreateChurch.mockRejectedValue(new ApiError(500, 'plain text whoops'))

    const result = await createChurchAction(null, buildForm())
    expect(result).toEqual({ error: 'plain text whoops' })
  })

  it('falls back to the raw message when the JSON has no `error` field', async () => {
    mockCreateChurch.mockRejectedValue(
      new ApiError(500, JSON.stringify({ message: 'no error key here' })),
    )

    const result = await createChurchAction(null, buildForm())
    expect(result).toEqual({ error: JSON.stringify({ message: 'no error key here' }) })
  })

  it('uses the generic message for non-ApiError exceptions', async () => {
    mockCreateChurch.mockRejectedValue(new Error('network blew up'))

    const result = await createChurchAction(null, buildForm())
    expect(result).toEqual({ error: 'Failed to create church.' })
  })

  it('rejects an empty name without calling the backend', async () => {
    const result = await createChurchAction(null, buildForm({ name: '' }))
    expect(result).toEqual({ error: 'Church name is required.' })
    expect(mockCreateChurch).not.toHaveBeenCalled()
  })
})
