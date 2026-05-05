/**
 * Tests for storage server actions. Focused on `pickAutoFrameAction`
 * since that's the new logic; existing actions
 * (`uploadVideoThumbnailAction` etc.) are exercised end-to-end via
 * the thumbnail-picker component test.
 */

vi.mock('server-only', () => ({}))
vi.mock('@/lib/dal', () => ({ verifySession: vi.fn() }))
vi.mock('@/lib/api/storage', () => ({ uploadToStorage: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ postgrest: vi.fn() }))
vi.mock('@/lib/api/pastors', () => ({ updatePastor: vi.fn() }))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { verifySession } from '@/lib/dal'
import { postgrest } from '@/lib/api/client'
import { pickAutoFrameAction } from '@/app/actions/storage'

const mockVerify = vi.mocked(verifySession)
const mockPostgrest = vi.mocked(postgrest)

const staffUser = {
  id: 'u1',
  name: 'Staff',
  email: 's@s',
  role: 'staff' as const,
  church_id: 'c1',
  church_name: 'Demo',
}

const FRAME_URL =
  'https://test-thumbnails.s3.us-west-2.amazonaws.com/churches/c1/videos/v1/thumb_.0000003.jpg'

beforeEach(() => {
  mockVerify.mockReset()
  mockPostgrest.mockReset()
})

describe('pickAutoFrameAction', () => {
  it('PATCHes the videos row with the chosen URL and returns success', async () => {
    mockVerify.mockResolvedValue(staffUser)
    mockPostgrest.mockResolvedValue({} as never)

    const result = await pickAutoFrameAction('v1', FRAME_URL)

    expect(result).toEqual({ success: true, url: FRAME_URL })
    expect(mockPostgrest).toHaveBeenCalledWith(
      '/videos?id=eq.v1',
      expect.objectContaining({
        method: 'PATCH',
        body: { thumbnail_url: FRAME_URL },
      }),
    )
  })

  it("rejects an empty URL without touching the backend", async () => {
    mockVerify.mockResolvedValue(staffUser)
    const result = await pickAutoFrameAction('v1', '')
    expect(result.error).toMatch(/missing thumbnail/i)
    expect(mockPostgrest).not.toHaveBeenCalled()
  })

  it('rejects when the user has no church_id', async () => {
    mockVerify.mockResolvedValue({ ...staffUser, church_id: null })
    const result = await pickAutoFrameAction('v1', FRAME_URL)
    expect(result.error).toMatch(/no church/i)
    expect(mockPostgrest).not.toHaveBeenCalled()
  })

  it('returns a string error when the backend PATCH throws', async () => {
    mockVerify.mockResolvedValue(staffUser)
    mockPostgrest.mockRejectedValue(new Error('Backend down'))

    const result = await pickAutoFrameAction('v1', FRAME_URL)

    expect(result).toEqual({ error: 'Backend down' })
  })
})
