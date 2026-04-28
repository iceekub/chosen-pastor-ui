'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

type ItemState = 'idle' | 'requesting' | 'uploading' | 'completing' | 'done' | 'error'

interface UploadItem {
  id: string
  file: File
  title: string
  serviceDate: string   // 'YYYY-MM-DD'
  pastor: string
  state: ItemState
  progress: number
  videoId: string | null
  error: string | null
}

function makeId() {
  return Math.random().toString(36).slice(2)
}

const MAX_FILES = 10

// ─── Label helper ─────────────────────────────────────────────────────────────

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-semibold mb-1"
      style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)', letterSpacing: '0.04em', textTransform: 'uppercase' }}
    >
      {children}
    </label>
  )
}

// ─── Per-item card ─────────────────────────────────────────────────────────────

function UploadItemCard({
  item,
  index,
  onUpdate,
  onRemove,
  uploading,
}: {
  item: UploadItem
  index: number
  onUpdate: (id: string, patch: Partial<UploadItem>) => void
  onRemove: (id: string) => void
  uploading: boolean
}) {
  const busy = item.state !== 'idle' && item.state !== 'error'
  const done = item.state === 'done'

  return (
    <div
      className="surface overflow-hidden anim-fadeUp"
      style={{
        animationDelay: `${index * 0.05}s`,
        borderColor: item.state === 'error' ? 'rgba(139,58,58,0.3)' : done ? 'rgba(90,138,106,0.3)' : undefined,
      }}
    >
      {/* Card header */}
      <div
        className="flex items-center justify-between px-5 py-2.5"
        style={{ background: 'rgba(230,218,200,0.3)', borderBottom: '1px solid #EAD9C4' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold" style={{ color: '#C5B49A', fontFamily: 'var(--font-mulish)' }}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <span
            className="text-xs truncate"
            style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}
            title={item.file.name}
          >
            {item.file.name}
          </span>
          <span className="text-xs shrink-0" style={{ color: '#C5B49A', fontFamily: 'var(--font-mulish)' }}>
            {formatBytes(item.file.size)}
          </span>
        </div>
        {!busy && !done && (
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="shrink-0 ml-3 text-base leading-none transition-colors"
            style={{ color: '#C5B49A', fontFamily: 'var(--font-mulish)' }}
            aria-label="Remove"
          >
            ×
          </button>
        )}
        {done && (
          <span className="shrink-0 ml-3 text-sm font-bold" style={{ color: '#5A8A6A' }}>✓</span>
        )}
      </div>

      {/* Fields / status */}
      <div className="px-5 py-4">
        {done ? (
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: '#5A8A6A', fontFamily: 'var(--font-mulish)' }}>
              Uploaded — processing in the background.
            </p>
            {item.videoId && (
              <Link
                href={`/sermons/${item.videoId}`}
                className="text-xs font-semibold ml-4 shrink-0"
                style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}
              >
                View →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Title + Service Date row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel htmlFor={`title-${item.id}`}>Title</FieldLabel>
                <input
                  id={`title-${item.id}`}
                  type="text"
                  value={item.title}
                  onChange={e => onUpdate(item.id, { title: e.target.value })}
                  disabled={busy}
                  className="input-warm w-full"
                  placeholder="Sunday Sermon — April 6"
                />
              </div>
              <div>
                <FieldLabel htmlFor={`date-${item.id}`}>Service date</FieldLabel>
                <input
                  id={`date-${item.id}`}
                  type="date"
                  value={item.serviceDate}
                  onChange={e => onUpdate(item.id, { serviceDate: e.target.value })}
                  disabled={busy}
                  className="input-warm w-full"
                />
              </div>
            </div>

            {/* Pastor row */}
            <div>
              <FieldLabel htmlFor={`pastor-${item.id}`}>
                Pastor{' '}
                <span style={{ color: '#C5B49A', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </FieldLabel>
              <input
                id={`pastor-${item.id}`}
                type="text"
                value={item.pastor}
                onChange={e => onUpdate(item.id, { pastor: e.target.value })}
                disabled={busy}
                className="input-warm w-full"
                placeholder="Pastor John Smith"
              />
            </div>

            {/* Progress / status */}
            {item.state === 'uploading' && (
              <div>
                <div className="flex justify-between text-xs mb-1" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
                  <span>Uploading…</span>
                  <span>{item.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(200,182,155,0.3)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${item.progress}%`, background: '#B8874A' }}
                  />
                </div>
              </div>
            )}
            {item.state === 'requesting' && (
              <p className="text-xs" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>Preparing…</p>
            )}
            {item.state === 'completing' && (
              <p className="text-xs" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>Finalizing…</p>
            )}
            {item.state === 'error' && item.error && (
              <p
                className="text-xs rounded-lg px-3 py-2"
                style={{ color: '#8B3A3A', background: 'rgba(139,58,58,0.08)', border: '1px solid rgba(139,58,58,0.2)', fontFamily: 'var(--font-mulish)' }}
              >
                {item.error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function VideoUpload() {
  const [items, setItems] = useState<UploadItem[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function updateItem(id: string, patch: Partial<UploadItem>) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))
  }

  function addFiles(files: FileList | File[]) {
    const remaining = MAX_FILES - items.length
    if (remaining <= 0) return
    const newItems: UploadItem[] = Array.from(files).slice(0, remaining).map(file => ({
      id: makeId(),
      file,
      title: file.name.replace(/\.[^.]+$/, ''),
      serviceDate: '',
      pastor: '',
      state: 'idle',
      progress: 0,
      videoId: null,
      error: null,
    }))
    setItems(prev => [...prev, ...newItems])
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) {
      addFiles(e.target.files)
      e.target.value = ''
    }
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(it => it.id !== id))
  }

  async function uploadOne(item: UploadItem) {
    const update = (patch: Partial<UploadItem>) => updateItem(item.id, patch)

    try {
      update({ state: 'requesting', error: null })
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          // pastor and serviceDate are stored here for future backend support
          description: [
            item.pastor ? `Pastor: ${item.pastor}` : null,
            item.serviceDate ? `Date: ${item.serviceDate}` : null,
          ].filter(Boolean).join(' | ') || undefined,
        }),
      })
      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to get upload URL')
      }
      const { presigned_upload_url, video_id } = await presignRes.json()
      update({ videoId: video_id, state: 'uploading' })

      await uploadToS3(presigned_upload_url, item.file, pct => update({ progress: pct }))

      update({ state: 'completing' })
      const completeRes = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id }),
      })
      if (!completeRes.ok) {
        const err = await completeRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to finalize upload')
      }

      update({ state: 'done' })
    } catch (err) {
      update({ state: 'error', error: err instanceof Error ? err.message : 'Upload failed' })
    }
  }

  async function handleUploadAll() {
    const pending = items.filter(it => it.state === 'idle' || it.state === 'error')
    if (!pending.length) return
    setUploading(true)
    await Promise.all(pending.map(uploadOne))
    setUploading(false)
  }

  function resetAll() {
    setItems([])
    setUploading(false)
  }

  const pendingItems = items.filter(it => it.state === 'idle' || it.state === 'error')
  const activeItems = items.filter(it => ['requesting', 'uploading', 'completing'].includes(it.state))
  const doneItems = items.filter(it => it.state === 'done')
  const allDone = items.length > 0 && doneItems.length === items.length

  // Disable upload if any pending item is missing required fields
  const canUpload =
    pendingItems.length > 0 &&
    !uploading &&
    pendingItems.every(it => it.title.trim() && it.serviceDate)

  const atMax = items.length >= MAX_FILES

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (atMax) return
    const files = e.dataTransfer.files
    if (files?.length) addFiles(files)
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
  }

  return (
    <div className="space-y-4">

      {/* Drop zone */}
      {!allDone && (
        <div
          onClick={() => !atMax && fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="surface px-8 py-10 text-center transition-colors"
          style={{
            borderStyle: 'dashed',
            borderColor: atMax ? '#E8D9C4' : '#C5B49A',
            cursor: atMax ? 'not-allowed' : 'pointer',
            opacity: atMax ? 0.6 : 1,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            multiple
            onChange={handleFilePick}
            className="hidden"
          />
          {items.length === 0 ? (
            <>
              <p className="text-sm" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
                Drag &amp; drop video files here, or click to select
              </p>
              <p className="text-xs mt-1" style={{ color: '#C5B49A', fontFamily: 'var(--font-mulish)' }}>
                MP4, MOV, MKV — up to {MAX_FILES} videos at once
              </p>
            </>
          ) : atMax ? (
            <p className="text-sm" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
              Maximum of {MAX_FILES} videos reached.
            </p>
          ) : (
            <p className="text-sm" style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}>
              + Add more videos ({items.length}/{MAX_FILES})
            </p>
          )}
        </div>
      )}

      {/* Upload item list */}
      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, index) => (
            <UploadItemCard
              key={item.id}
              item={item}
              index={index}
              onUpdate={updateItem}
              onRemove={removeItem}
              uploading={uploading}
            />
          ))}
        </div>
      )}

      {/* Summary + actions */}
      {items.length > 0 && (
        <div className="flex items-center justify-between pt-1">
          {allDone ? (
            <>
              <p className="text-sm" style={{ color: '#5A8A6A', fontFamily: 'var(--font-mulish)' }}>
                {doneItems.length} sermon{doneItems.length !== 1 ? 's' : ''} uploaded — processing in the background.
              </p>
              <button
                type="button"
                onClick={resetAll}
                className="text-sm font-semibold"
                style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}
              >
                Upload more
              </button>
            </>
          ) : (
            <>
              <p className="text-xs" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
                {activeItems.length > 0
                  ? `Uploading ${activeItems.length} of ${items.length}…`
                  : `${pendingItems.length} ready to upload · ${doneItems.length} done`}
              </p>
              <button
                type="button"
                onClick={handleUploadAll}
                disabled={!canUpload}
                className="btn-gold px-6 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading
                  ? 'Uploading…'
                  : `Upload${items.length > 1 ? ` all ${items.length}` : ''}`}
              </button>
            </>
          )}
        </div>
      )}

    </div>
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
    // Backend always signs the presigned URL for video/mp4 — must match exactly
    xhr.setRequestHeader('Content-Type', 'video/mp4')
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error(`S3 error ${xhr.status}`))
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(file)
  })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}
