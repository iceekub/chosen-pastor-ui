'use client'

import { useRef, useState, useTransition } from 'react'

import {
  pickAutoFrameAction,
  uploadVideoThumbnailAction,
} from '@/app/actions/storage'
import type { Video } from '@/lib/api/types'
import { isAutoFrameUrl, sampleThumbnailKeys, thumbnailKeyToUrl } from '@/lib/thumbnails'

interface Props {
  video: Video
}

export function ThumbnailPicker({ video }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [pickedUrl, setPickedUrl] = useState<string | null>(video.thumbnail_url)

  // The most recently uploaded custom thumbnail — stored in its own DB column
  // so it persists even after switching to an auto-frame.
  const [customUploadUrl, setCustomUploadUrl] = useState<string | null>(
    video.custom_thumbnail_url ?? null,
  )

  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedKey = video.thumbnail_keys.find(
    (k) => thumbnailKeyToUrl(k) === pickedUrl,
  ) ?? null

  const candidates = sampleThumbnailKeys(video.thumbnail_keys, 5, selectedKey)
    .map((key) => ({ key, url: thumbnailKeyToUrl(key) }))
    .filter((c) => c.url)

  function handlePick(url: string) {
    if (url === pickedUrl) return
    setError(null)
    startTransition(async () => {
      const result = await pickAutoFrameAction(video.id, url)
      if (result.error) { setError(result.error); return }
      setPickedUrl(url)
    })
  }

  async function handleUpload(file: File) {
    setError(null)
    const formData = new FormData()
    formData.append('file', file)
    const result = await uploadVideoThumbnailAction(video.id, formData)
    if (result.error) { setError(result.error); return }
    if (result.url) {
      setPickedUrl(result.url)
      setCustomUploadUrl(result.url)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    startTransition(() => handleUpload(file))
  }

  return (
    <div className="surface px-6 py-5 mb-6 anim-fadeUp" style={{ animationDelay: '0.07s' }}>
      <p className="section-label mb-3">Thumbnail</p>

      {candidates.length > 0 ? (
        <>
          <p className="text-xs mb-2" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
            Auto-generated frames
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
            {candidates.map(({ key, url }) => {
              const selected = url === pickedUrl
              return (
                <Tile
                  key={key}
                  url={url}
                  selected={selected}
                  pending={pending}
                  onPick={() => handlePick(url)}
                />
              )
            })}
          </div>
        </>
      ) : (
        <p className="text-xs mb-4" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
          No auto-generated frames available.
        </p>
      )}

      {/* Custom upload — shown permanently once a custom thumbnail exists */}
      {customUploadUrl && (
        <>
          <p className="text-xs mb-2" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
            Custom upload
          </p>
          <div className="mb-4" style={{ width: 'calc(20% - 4px)', minWidth: 80 }}>
            <Tile
              url={customUploadUrl}
              selected={customUploadUrl === pickedUrl}
              pending={pending}
              onPick={() => handlePick(customUploadUrl)}
            />
          </div>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={pending}
        className="text-xs underline disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        {pending ? 'Uploading…' : customUploadUrl ? 'Replace custom upload' : 'Upload your own'}
      </button>

      {error && (
        <p
          className="text-sm rounded-lg px-3 py-2 mt-3"
          style={{ color: '#8B3A3A', background: 'rgba(139,58,58,0.08)', border: '1px solid rgba(139,58,58,0.2)', fontFamily: 'var(--font-mulish)' }}
        >
          {error}
        </p>
      )}
    </div>
  )
}

function Tile({
  url,
  selected,
  pending,
  onPick,
}: {
  url: string
  selected: boolean
  pending: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={pending}
      aria-pressed={selected}
      className="relative rounded-md overflow-hidden border-2 transition-colors disabled:cursor-not-allowed w-full"
      style={{ borderColor: selected ? '#B8874A' : 'rgba(200,182,155,0.3)' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Frame option" className="block w-full aspect-video object-cover" />
      {selected && (
        <span
          className="absolute top-1 right-1 text-[10px] font-semibold rounded-full px-1.5 py-0.5"
          style={{ background: '#B8874A', color: 'white', fontFamily: 'var(--font-mulish)' }}
        >
          Selected
        </span>
      )}
    </button>
  )
}
