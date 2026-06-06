/**
 * Pure-function tests for the auto-frame URL helpers. The bucket
 * base URL is set in `vitest.setup.ts` so this module loads with
 * it populated.
 */

import { describe, it, expect } from 'vitest'

import { isAutoFrameUrl, sampleThumbnailKeys, thumbnailKeyToUrl } from '@/lib/thumbnails'

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

describe('sampleThumbnailKeys', () => {
  const keys = Array.from({ length: 81 }, (_, i) => `thumb_${String(i).padStart(7, '0')}.jpg`)

  it('returns the array unchanged when at or below count', () => {
    expect(sampleThumbnailKeys(['a', 'b', 'c'], 5)).toEqual(['a', 'b', 'c'])
    expect(sampleThumbnailKeys(['a', 'b', 'c', 'd', 'e'], 5)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('returns exactly count keys for a large array', () => {
    expect(sampleThumbnailKeys(keys, 5)).toHaveLength(5)
  })

  it('samples from the middle — none of the 5 are from the outer 15% on either end', () => {
    const trim = Math.floor(keys.length * 0.15) // 12
    const sampled = sampleThumbnailKeys(keys, 5)
    for (const k of sampled) {
      const idx = keys.indexOf(k)
      expect(idx).toBeGreaterThanOrEqual(trim)
      expect(idx).toBeLessThan(keys.length - trim)
    }
  })

  it('always includes the selectedKey, replacing the nearest sample', () => {
    const selectedKey = keys[2] // in the trimmed-off leading 15%
    const sampled = sampleThumbnailKeys(keys, 5, selectedKey)
    expect(sampled).toHaveLength(5)
    expect(sampled).toContain(selectedKey)
  })

  it('does not duplicate the selectedKey when it is already in the sample', () => {
    const sampled = sampleThumbnailKeys(keys, 5)
    const alreadyIn = sampled[2]
    const result = sampleThumbnailKeys(keys, 5, alreadyIn)
    expect(result).toEqual(sampled)
    expect(result.filter((k) => k === alreadyIn)).toHaveLength(1)
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
