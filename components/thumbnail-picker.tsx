'use client'

import { useState, useTransition } from 'react'

import {
  pickAutoFrameAction,
  uploadVideoThumbnailAction,
} from '@/app/actions/storage'
import type { Video } from '@/lib/api/types'
import { isAutoFrameUrl, thumbnailKeyToUrl } from '@/lib/thumbnails'

interface Props {
  video: Video
}

/**
 * Thumbnail management for a sermon. Two affordances on one panel:
 *
 *   1. **Pick** from the ≤5 auto-generated MediaConvert frames as
 *      the official thumbnail. Click a candidate → server action
 *      PATCHes videos.thumbnail_url to that frame's public URL.
 *      No data is copied — the auto-frames live in S3 and stay
 *      there. Currently-selected one is visually marked.
 *
 *   2. **Upload** a custom override. File goes to the
 *      `video-thumbnails` Supabase Storage bucket and replaces
 *      videos.thumbnail_url with the upload's public URL.
 *
 * If `thumbnail_keys` is empty (e.g. YouTube import that never
 * went through MediaConvert) only the upload affordance shows.
 */
export function ThumbnailPicker({ video }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [pickedUrl, setPickedUrl] = useState<string | null>(video.thumbnail_url)

  const candidates = video.thumbnail_keys
    .map((key) => ({ key, url: thumbnailKeyToUrl(key) }))
    .filter((c) => c.url) // empty when env var unset; degrades gracefully

  function handlePick(url: string) {
    if (url === pickedUrl) return
    setError(null)
    startTransition(async () => {
      const result = await pickAutoFrameAction(video.id, url)
      if (result.error) {
        setError(result.error)
        return
      }
      setPickedUrl(url)
    })
  }

  async function handleUpload(formData: FormData) {
    setError(null)
    const result = await uploadVideoThumbnailAction(video.id, formData)
    if (result.error) {
      setError(result.error)
      return
    }
    if (result.url) setPickedUrl(result.url)
  }

  // Auto-frame URL the picker doesn't already render as a candidate.
  // Always either matches one of the candidates (highlighted there)
  // or is a custom upload (Supabase Storage URL); the latter we show
  // as a small "current" preview above the candidates so staff see
  // what's currently set.
  const customOverride =
    pickedUrl !== null && !isAutoFrameUrl(pickedUrl)
      ? pickedUrl
      : null

  return (
    <div className="surface px-6 py-5 mb-6 anim-fadeUp" style={{ animationDelay: '0.07s' }}>
      <p className="section-label mb-3">Thumbnail</p>

      {customOverride && (
        <div className="mb-4 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={customOverride}
            alt="Current custom thumbnail"
            className="rounded-md object-cover"
            width={120}
            height={68}
          />
          <p className="text-xs" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
            Custom upload in use. Pick an auto-frame below to replace it.
          </p>
        </div>
      )}

      {candidates.length > 0 ? (
        <>
          <p className="text-xs mb-2" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
            Auto-generated frames (click to pick)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">
            {candidates.map(({ key, url }) => {
              const selected = url === pickedUrl
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePick(url)}
                  disabled={pending}
                  aria-pressed={selected}
                  className="relative rounded-md overflow-hidden border-2 transition-colors disabled:cursor-not-allowed"
                  style={{
                    borderColor: selected ? '#B8874A' : 'rgba(200,182,155,0.3)',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Frame option`}
                    className="block w-full aspect-video object-cover"
                  />
                  {selected && (
                    <span
                      className="absolute top-1 right-1 text-[10px] font-semibold rounded-full px-1.5 py-0.5"
                      style={{
                        background: '#B8874A',
                        color: 'white',
                        fontFamily: 'var(--font-mulish)',
                      }}
                    >
                      Selected
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <p className="text-xs mb-4" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
          No auto-generated frames available
          {video.thumbnail_keys.length === 0
            ? ' (this video didn’t go through MediaConvert).'
            : '. Set NEXT_PUBLIC_AWS_THUMBNAILS_BUCKET_URL to enable the picker.'}
        </p>
      )}

      <form action={handleUpload}>
        <label
          className="block text-xs mb-2"
          style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}
        >
          Or upload your own (JPEG / PNG / WebP / GIF, &le;10 MB)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            required
            className="text-xs"
            style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}
          />
          <button
            type="submit"
            disabled={pending}
            className="btn-gold px-4 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Upload
          </button>
        </div>
      </form>

      {error && (
        <p
          className="text-sm rounded-lg px-3 py-2 mt-3"
          style={{
            color: '#8B3A3A',
            background: 'rgba(139,58,58,0.08)',
            border: '1px solid rgba(139,58,58,0.2)',
            fontFamily: 'var(--font-mulish)',
          }}
        >
          {error}
        </p>
      )}
    </div>
  )
}
