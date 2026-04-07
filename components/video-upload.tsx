'use client'

import { useState, useRef } from 'react'
import type { Tag } from '@/lib/api/types'

type UploadState = 'idle' | 'requesting' | 'uploading' | 'completing' | 'done' | 'error'

interface VideoUploadProps {
  tags: Tag[]
}

export function VideoUpload({ tags }: VideoUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (!picked) return
    setFile(picked)
    if (!title) setTitle(picked.name.replace(/\.[^.]+$/, ''))
    setError(null)
    setUploadState('idle')
  }

  function toggleTag(id: number) {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setError(null)
    setProgress(0)

    try {
      // Step 1: Get pre-signed URL from our route handler
      setUploadState('requesting')
      const presignRes = await fetch(
        `/api/upload/presign?filename=${encodeURIComponent(file.name)}&content_type=${encodeURIComponent(file.type)}`
      )
      if (!presignRes.ok) throw new Error('Failed to get upload URL')
      const { upload_url, key, sermon_id } = await presignRes.json()

      // Step 2: Upload directly to S3
      setUploadState('uploading')
      await uploadToS3(upload_url, file, setProgress)

      // Step 3: Notify backend the upload is complete
      setUploadState('completing')
      const completeRes = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sermon_id, key, title, tag_ids: selectedTags }),
      })
      if (!completeRes.ok) throw new Error('Failed to finalize upload')

      setUploadState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setUploadState('error')
    }
  }

  if (uploadState === 'done') {
    return (
      <div className="bg-white rounded-xl border border-emerald-200 p-8 text-center">
        <div className="text-4xl mb-3">✓</div>
        <p className="text-base font-semibold text-stone-900">Sermon uploaded successfully</p>
        <p className="text-sm text-stone-400 mt-1">
          Your video is being processed and will appear in your library shortly.
        </p>
        <button
          onClick={() => {
            setFile(null)
            setTitle('')
            setSelectedTags([])
            setUploadState('idle')
            if (fileInputRef.current) fileInputRef.current.value = ''
          }}
          className="mt-5 text-sm text-emerald-700 underline hover:no-underline"
        >
          Upload another
        </button>
      </div>
    )
  }

  const isSubmitting = ['requesting', 'uploading', 'completing'].includes(uploadState)

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* File picker */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`bg-white rounded-xl border-2 border-dashed px-8 py-12 text-center cursor-pointer transition-colors ${
          file ? 'border-emerald-400 bg-emerald-50' : 'border-stone-300 hover:border-stone-400'
        }`}
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
            <p className="text-sm font-medium text-stone-900">{file.name}</p>
            <p className="text-xs text-stone-400 mt-1">{formatBytes(file.size)}</p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-stone-500">Click to select a video file</p>
            <p className="text-xs text-stone-400 mt-1">MP4, MOV, MKV — up to several GB</p>
          </div>
        )}
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder="Sunday Sermon — April 6"
        />
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Tags</label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  selectedTags.includes(tag.id)
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-stone-600 border-stone-300 hover:border-stone-400'
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Progress bar */}
      {uploadState === 'uploading' && (
        <div>
          <div className="flex justify-between text-xs text-stone-500 mb-1">
            <span>Uploading…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {uploadState === 'completing' && (
        <p className="text-sm text-stone-500">Finalizing upload…</p>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!file || !title || isSubmitting}
        className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
