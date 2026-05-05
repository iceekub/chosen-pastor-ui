/**
 * Unit tests for lib/api/videos.ts — specifically the write functions
 * (createVideo, generateGardens) whose param contracts have been
 * broken by past rebases.
 *
 * We mock the ragserv transport so these tests run without a network.
 */

vi.mock('server-only', () => ({}))
vi.mock('@/lib/api/client', () => ({
  postgrest: vi.fn(),
  ragserv: vi.fn(),
}))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ragserv } from '@/lib/api/client'
import { createVideo, generateGardens } from '@/lib/api/videos'

const mockRagserv = ragserv as ReturnType<typeof vi.fn>

beforeEach(() => vi.clearAllMocks())

// ── createVideo ─────────────────────────────────────────────────────────────

describe('createVideo', () => {
  it('sends title and video_type in the request body', async () => {
    mockRagserv.mockResolvedValue({ id: 'v1', presigned_upload_url: '...', status: 'pending_upload' })
    await createVideo('Sunday Sermon')
    expect(mockRagserv).toHaveBeenCalledWith('/videos', expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({ title: 'Sunday Sermon', video_type: 'sermon' }),
    }))
  })

  it('includes video_date in the body when provided', async () => {
    mockRagserv.mockResolvedValue({ id: 'v1', presigned_upload_url: '...', status: 'pending_upload' })
    await createVideo('Easter Sermon', undefined, undefined, '2026-04-05')
    const [, init] = mockRagserv.mock.calls[0]
    expect(init.body).toMatchObject({ video_date: '2026-04-05' })
  })

  // Regression: the 5th param (contentType) was dropped during a rebase, so
  // S3 pre-signed URLs were generated without Content-Type enforcement.
  it('includes content_type in the body when provided (5th param regression)', async () => {
    mockRagserv.mockResolvedValue({ id: 'v1', presigned_upload_url: '...', status: 'pending_upload' })
    await createVideo('Sunday Sermon', undefined, undefined, undefined, 'video/mp4')
    const [, init] = mockRagserv.mock.calls[0]
    expect(init.body).toMatchObject({ content_type: 'video/mp4' })
  })

})

// ── generateGardens ─────────────────────────────────────────────────────────

describe('generateGardens', () => {
  it('sends video_id and week_starts_at in the request body', async () => {
    mockRagserv.mockResolvedValue([])
    await generateGardens('v1', '2026-04-27')
    expect(mockRagserv).toHaveBeenCalledWith('/gardens/generate', expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({ video_id: 'v1', week_starts_at: '2026-04-27' }),
    }))
  })

  it('includes instructions in the body when provided', async () => {
    mockRagserv.mockResolvedValue([])
    await generateGardens('v1', '2026-04-27', 'Focus on grace')
    const [, init] = mockRagserv.mock.calls[0]
    expect(init.body).toMatchObject({ instructions: 'Focus on grace' })
  })

  it('omits instructions from body when not provided', async () => {
    mockRagserv.mockResolvedValue([])
    await generateGardens('v1', '2026-04-27')
    const [, init] = mockRagserv.mock.calls[0]
    expect(init.body).not.toHaveProperty('instructions')
  })
})
