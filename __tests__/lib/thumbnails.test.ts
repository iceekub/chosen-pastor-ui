/**
 * Pure-function tests for the auto-frame URL helpers. The bucket
 * base URL is set in `vitest.setup.ts` so this module loads with
 * it populated.
 */

import { describe, it, expect } from 'vitest'

import { isAutoFrameUrl, thumbnailKeyToUrl } from '@/lib/thumbnails'

describe('thumbnailKeyToUrl', () => {
  it('joins the configured base URL with the key', () => {
    const url = thumbnailKeyToUrl('churches/abc/videos/v1/thumb_.0000003.jpg')
    expect(url).toBe(
      'https://test-thumbnails.s3.us-west-2.amazonaws.com/churches/abc/videos/v1/thumb_.0000003.jpg',
    )
  })

  it('handles a leading slash on the key without doubling', () => {
    const url = thumbnailKeyToUrl('/churches/abc/videos/v1/thumb_.0000003.jpg')
    expect(url).not.toContain('//churches')
    expect(url.endsWith('/churches/abc/videos/v1/thumb_.0000003.jpg')).toBe(true)
  })
})

describe('isAutoFrameUrl', () => {
  it('returns true for URLs against the configured base', () => {
    expect(
      isAutoFrameUrl(
        'https://test-thumbnails.s3.us-west-2.amazonaws.com/churches/x/videos/y/thumb_.0000001.jpg',
      ),
    ).toBe(true)
  })

  it('returns false for URLs from a different host (e.g. Supabase Storage upload)', () => {
    expect(
      isAutoFrameUrl(
        'https://abc.supabase.co/storage/v1/object/public/video-thumbnails/x/y/thumbnail.jpg',
      ),
    ).toBe(false)
  })

  it('returns false for null', () => {
    expect(isAutoFrameUrl(null)).toBe(false)
  })
})
