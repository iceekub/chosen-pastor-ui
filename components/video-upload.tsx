'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

type UploadState = 'idle' | 'requesting' | 'uploading' | 'completing' | 'done' | 'error'

export function VideoUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [videoId, setVideoId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (!picked) return
    setFile(picked)
    if (!title) setTitle(picked.name.replace(/\.[^.]+$/, ''))
    setError(null)
    setUploadState('idle')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setError(null)
    setProgress(0)

    try {
      // Step 1: Create video record and get presigned URL
      setUploadState('requesting')
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: description || undefined }),
      })
      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to get upload URL')
      }
      const { presigned_upload_url, video_id } = await presignRes.json()
      setVideoId(video_id)

      // Step 2: Upload directly to S3
      setUploadState('uploading')
      await uploadToS3(presigned_upload_url, file, setProgress)

      // Step 3: Notify backend the upload is complete (triggers processing)
      setUploadState('completing')
      const completeRes = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id }),
      })
      if (!completeRes.ok) {
        const err = await completeRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to finalize upload')
      }

      setUploadState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setUploadState('error')
    }
  }

  if (uploadState === 'done') {
    return (
      <div className="surface px-8 py-10 text-center">
        <div className="text-4xl mb-3" style={{ color: '#5A8A6A' }}>&#10003;</div>
        <p
          className="text-base font-semibold"
          style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}
        >
          Sermon uploaded successfully
        </p>
        <p
          className="text-sm mt-1"
          style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}
        >
          Your video is being processed. This can take a while for longer videos.
        </p>
        <div className="flex items-center justify-center gap-4 mt-5">
          {videoId && (
            <Link
              href={`/sermons/${videoId}`}
              className="btn-gold inline-block px-5 py-2 text-sm"
            >
              View sermon
            </Link>
          )}
          <button
            onClick={() => {
              setFile(null)
              setTitle('')
              setDescription('')
              setUploadState('idle')
              setVideoId(null)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
            className="text-sm underline hover:no-underline"
            style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}
          >
            Upload another
          </button>
        </div>
      </div>
    )
  }

  const isSubmitting = ['requesting', 'uploading', 'completing'].includes(uploadState)

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* File picker */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="surface px-8 py-12 text-center cursor-pointer transition-colors"
        style={{
          borderStyle: 'dashed',
          borderColor: file ? '#B8874A' : undefined,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFilePick}
          className="hidden"
        />
        {file ? (
          <div>
            <p className="text-sm font-medium" style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}>
              {file.name}
            </p>
            <p className="text-xs mt-1" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
              {formatBytes(file.size)}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
              Click to select a video file
            </p>
            <p className="text-xs mt-1" style={{ color: '#C5B49A', fontFamily: 'var(--font-mulish)' }}>
              MP4, MOV, MKV — up to several GB
            </p>
          </div>
        )}
      </div>

      {/* Title */}
      <div>
        <label
          className="block text-sm font-medium mb-1"
          style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}
        >
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="input-warm w-full"
          placeholder="Sunday Sermon — April 6"
        />
      </div>

      {/* Description */}
      <div>
        <label
          className="block text-sm font-medium mb-1"
          style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}
        >
          Description <span style={{ color: '#C5B49A' }}>(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="input-warm w-full"
          placeholder="Brief description of this sermon..."
        />
      </div>

      {/* Progress bar */}
      {uploadState === 'uploading' && (
        <div>
          <div
            className="flex justify-between text-xs mb-1"
            style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}
          >
            <span>Uploading…</span>
            <span>{progress}%</span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: 'rgba(200,182,155,0.3)' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: '#B8874A' }}
            />
          </div>
        </div>
      )}

      {uploadState === 'completing' && (
        <p className="text-sm" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
          Finalizing upload…
        </p>
      )}

      {/* Error */}
      {error && (
        <p
          className="text-sm rounded-lg px-3 py-2"
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

      <button
        type="submit"
        disabled={!file || !title || isSubmitting}
        className="btn-gold w-full px-4 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Uploading…' : 'Upload Sermon'}
      </button>
    </form>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uploadToS3(
  url: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`S3 error ${xhr.status}`)))
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(file)
  })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}
