'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { toISODate } from '@/lib/dates'
import { uploadVideoThumbnailAction } from '@/app/actions/storage'

type ItemState = 'idle' | 'requesting' | 'uploading' | 'done' | 'error'

interface UploadItem {
  id: string
  file: File
  title: string
  serviceDate: string   // 'YYYY-MM-DD'
  thumbnail: File | null
  thumbnailPreview: string | null
  state: ItemState
  progress: number
  videoId: string | null
  videoRole: string | null
  error: string | null
}

const MAX_FILES = 10

function makeId() {
  return Math.random().toString(36).slice(2)
}

function makeItem(file: File): UploadItem {
  return {
    id: makeId(),
    file,
    title: file.name.replace(/\.[^.]+$/, ''),
    serviceDate: toISODate(new Date()),
    thumbnail: null,
    thumbnailPreview: null,
    state: 'idle',
    progress: 0,
    videoId: null,
    videoRole: null,
    error: null,
  }
}

// ─── Label helper ──────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs font-semibold mb-1"
      style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)', letterSpacing: '0.04em', textTransform: 'uppercase' }}
    >
      {children}
    </p>
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
  const thumbInputRef = useRef<HTMLInputElement>(null)
  const busy = item.state !== 'idle' && item.state !== 'error'
  const done = item.state === 'done'

  function handleThumbnailPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (!picked) return
    onUpdate(item.id, {
      thumbnail: picked,
      thumbnailPreview: URL.createObjectURL(picked),
    })
  }

  function removeThumbnail() {
    if (item.thumbnailPreview) URL.revokeObjectURL(item.thumbnailPreview)
    onUpdate(item.id, { thumbnail: null, thumbnailPreview: null })
    if (thumbInputRef.current) thumbInputRef.current.value = ''
  }

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
          <span className="text-xs truncate" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }} title={item.file.name}>
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
            className="shrink-0 ml-3 text-base leading-none"
            style={{ color: '#C5B49A' }}
            aria-label="Remove"
          >
            ×
          </button>
        )}
        {done && <span className="shrink-0 ml-3 text-sm font-bold" style={{ color: '#5A8A6A' }}>✓</span>}
      </div>

      {/* Fields */}
      <div className="px-5 py-4 space-y-3">
        {/* Title */}
        <div>
          <FieldLabel>Title</FieldLabel>
          <input
            type="text"
            value={item.title}
            onChange={e => onUpdate(item.id, { title: e.target.value })}
            disabled={busy || done}
            className="input-warm w-full"
            placeholder="Sunday Sermon"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Sermon date */}
          <div>
            <FieldLabel>Sermon date</FieldLabel>
            {/* Uncontrolled — avoids React setting the `value` attribute during
                re-renders, which causes Chrome's native calendar picker to
                immediately dismiss. Guard onClick to stop any accidental bubbling
                up to the drop-zone click handler. */}
            <input
              type="date"
              defaultValue={item.serviceDate}
              onChange={e => { if (e.target.value) onUpdate(item.id, { serviceDate: e.target.value }) }}
              onClick={e => e.stopPropagation()}
              disabled={busy || done}
              className="input-warm w-full"
            />
          </div>

          {/* Thumbnail */}
          <div>
            <FieldLabel>Thumbnail <span style={{ color: '#C5B49A', textTransform: 'none', letterSpacing: 0 }}>(optional)</span></FieldLabel>
            <input
              ref={thumbInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleThumbnailPick}
              className="hidden"
            />
            {item.thumbnailPreview ? (
              <div className="flex items-center gap-2">
                <img
                  src={item.thumbnailPreview}
                  alt="thumb"
                  className="h-9 w-16 rounded object-cover"
                  style={{ border: '1px solid rgba(184,135,74,0.3)' }}
                />
                <div className="flex flex-col gap-1">
                  <button type="button" onClick={() => thumbInputRef.current?.click()} className="text-xs underline" style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}>Change</button>
                  <button type="button" onClick={removeThumbnail} className="text-xs underline" style={{ color: '#9A8878', fontFamily: 'var(--font-mulish)' }}>Remove</button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => thumbInputRef.current?.click()}
                disabled={busy || done}
                className="surface flex items-center gap-2 px-3 py-2 text-xs transition-colors"
                style={{ fontFamily: 'var(--font-mulish)', color: '#8A7060', borderStyle: 'dashed' }}
              >
                <span style={{ color: '#B8874A' }}>+</span> Add image
              </button>
            )}
          </div>
        </div>

        {/* Progress */}
        {item.state === 'uploading' && (
          <div>
            <div className="flex justify-between text-xs mb-1" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
              <span>Uploading…</span><span>{item.progress}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(200,182,155,0.3)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${item.progress}%`, background: '#B8874A' }} />
            </div>
          </div>
        )}
        {item.state === 'requesting' && (
          <p className="text-xs" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>Preparing upload…</p>
        )}
        {item.state === 'error' && item.error && (
          <p className="text-xs rounded px-2 py-1.5" style={{ color: '#8B3A3A', background: 'rgba(139,58,58,0.08)', border: '1px solid rgba(139,58,58,0.2)', fontFamily: 'var(--font-mulish)' }}>
            {item.error}
          </p>
        )}
        {done && item.videoRole === 'primary' && (
          <p className="text-xs" style={{ color: '#5A8A6A', fontFamily: 'var(--font-mulish)', fontWeight: 600 }}>
            Set as primary — ready to generate gardens once processing completes.
          </p>
        )}
        {done && item.videoId && (
          <Link href={`/sermons/${item.videoId}`} className="text-xs font-semibold" style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}>
            View sermon →
          </Link>
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

  function removeItem(id: string) {
    setItems(prev => {
      const item = prev.find(it => it.id === id)
      if (item?.thumbnailPreview) URL.revokeObjectURL(item.thumbnailPreview)
      return prev.filter(it => it.id !== id)
    })
  }

  function addFiles(files: FileList) {
    const slots = MAX_FILES - items.length
    const toAdd = Array.from(files).slice(0, slots).map(makeItem)
    setItems(prev => [...prev, ...toAdd])
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) addFiles(e.target.files)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (atMax) return
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
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
          video_date: item.serviceDate || undefined,
          content_type: item.file.type || 'video/mp4',
        }),
      })
      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to get upload URL')
      }
      const { presigned_upload_url, video_id, role } = await presignRes.json()
      update({ videoId: video_id, videoRole: role ?? null, state: 'uploading' })

      // S3 ObjectCreated event triggers transcode Lambda automatically — no complete call needed
      await uploadToS3(presigned_upload_url, item.file, item.file.type || 'video/mp4', pct => update({ progress: pct }))

      // Thumbnail upload — non-fatal
      if (item.thumbnail) {
        const fd = new FormData()
        fd.append('file', item.thumbnail)
        await uploadVideoThumbnailAction(video_id, fd).catch(() => {})
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
    items.forEach(it => { if (it.thumbnailPreview) URL.revokeObjectURL(it.thumbnailPreview) })
    setItems([])
    setUploading(false)
  }

  const atMax = items.length >= MAX_FILES
  const pendingItems = items.filter(it => it.state === 'idle' || it.state === 'error')
  const activeItems = items.filter(it => it.state === 'requesting' || it.state === 'uploading')
  const doneItems = items.filter(it => it.state === 'done')
  const allDone = items.length > 0 && doneItems.length === items.length
  const canUpload = pendingItems.length > 0 && !uploading && pendingItems.every(it => it.title.trim() && it.serviceDate)

  return (
    <div className="space-y-4">

      {/* Drop zone */}
      {!allDone && (
        <div
          onClick={() => !atMax && fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
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

      {/* Item list */}
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
              <button type="button" onClick={resetAll} className="text-sm font-semibold" style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}>
                Upload more
              </button>
            </>
          ) : (
            <>
              <p className="text-xs" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
                {activeItems.length > 0
                  ? `Uploading ${activeItems.length} of ${items.length}…`
                  : `${pendingItems.length} ready · ${doneItems.length} done`}
              </p>
              <button
                type="button"
                onClick={handleUploadAll}
                disabled={!canUpload}
                className="btn-gold px-6 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading…' : `Upload${items.length > 1 ? ` all ${items.length}` : ''}`}
              </button>
            </>
          )}
        </div>
      )}

    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uploadToS3(url: string, file: File, contentType: string, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', contentType)
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
