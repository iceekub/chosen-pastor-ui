'use client'

import { useRef, useState, useTransition } from 'react'
import type { UploadResult } from '@/app/actions/storage'

type UploadAction = (formData: FormData) => Promise<UploadResult>

interface ImageUploadProps {
  action: UploadAction
  currentUrl?: string | null
  label: string
  hint?: string
  /** CSS aspect-ratio value, e.g. "16/9" or "1/1" */
  aspectRatio?: string
  /** How the image fills its box. Use "contain" for logos, "cover" for hero images. */
  objectFit?: 'cover' | 'contain'
  /** Optional callback when upload succeeds — receives the new public URL */
  onSuccess?: (url: string) => void
}

export function ImageUpload({
  action,
  currentUrl,
  label,
  hint,
  aspectRatio = '16/9',
  objectFit = 'cover',
  onSuccess,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl ?? null)
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Optimistic preview
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)
    setError(null)

    const formData = new FormData()
    formData.set('file', file)

    startTransition(async () => {
      const result = await action(formData)
      if (result.error) {
        setError(result.error)
        setPreviewUrl(currentUrl ?? null) // revert
      } else if (result.url) {
        setPreviewUrl(result.url)
        onSuccess?.(result.url)
      }
    })

    // Reset input so the same file can be re-selected if needed
    e.target.value = ''
  }

  const hasImage = Boolean(previewUrl)

  return (
    <div>
      {label && (
        <label
          className="block text-xs font-semibold mb-1.5"
          style={{
            color: '#8A7060',
            fontFamily: 'var(--font-mulish)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </label>
      )}
      {hint && (
        <p className="text-xs mb-2" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
          {hint}
        </p>
      )}

      <div
        className="relative rounded-xl overflow-hidden cursor-pointer group"
        style={{
          border: hasImage ? '1px solid #EAD9C4' : '2px dashed #D5C9B8',
          aspectRatio,
          background: '#FAF7F2',
        }}
        onClick={() => !isPending && inputRef.current?.click()}
      >
        {/* Image or empty state */}
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={label}
            className={`absolute inset-0 w-full h-full ${objectFit === 'contain' ? 'object-contain p-2' : 'object-cover'}`}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-2">
            <UploadIcon />
            <p className="text-xs leading-tight" style={{ color: '#C5B49A', fontFamily: 'var(--font-mulish)', textAlign: 'center' }}>
              Click to upload
            </p>
          </div>
        )}

        {/* Hover overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(44,30,15,0.45)' }}
        >
          <p className="text-xs font-semibold text-white" style={{ fontFamily: 'var(--font-mulish)' }}>
            {isPending ? 'Uploading…' : hasImage ? 'Change image' : 'Upload image'}
          </p>
        </div>
      </div>

      {error && (
        <p className="text-xs mt-1.5" style={{ color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}>
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
      />
    </div>
  )
}

function UploadIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="#C5B49A"
      strokeWidth={1.75}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  )
}
