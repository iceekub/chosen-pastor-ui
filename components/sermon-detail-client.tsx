'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/lib/notifications'
import { ThumbnailPicker } from '@/components/thumbnail-picker'
import type {
  GardenListItem,
  GardenStatus,
  Video,
  VideoDownloadAttempt,
  VideoListItem,
  VideoStatus,
} from '@/lib/api/types'
import {
  formatGardenDateLong,
  formatGardenDateShort,
  toISODate,
} from '@/lib/dates'

const STATUS_DISPLAY: Record<VideoStatus, { label: string; color: string; bg: string }> = {
  pending_upload:   { label: 'Pending Upload',  color: '#9A8878', bg: 'rgba(154,136,120,0.1)' },
  downloading:      { label: 'Downloading',     color: '#5878A8', bg: 'rgba(88,120,168,0.1)' },
  transcoding:      { label: 'Transcoding',     color: '#B8874A', bg: 'rgba(184,135,74,0.12)' },
  transcode_failed: { label: 'Transcode Failed', color: '#8B3A3A', bg: 'rgba(139,58,58,0.08)' },
  uploaded:         { label: 'Uploaded',        color: '#5878A8', bg: 'rgba(88,120,168,0.1)' },
  processing:       { label: 'Processing',      color: '#B8874A', bg: 'rgba(184,135,74,0.12)' },
  ready:            { label: 'Ready',           color: '#5A8A6A', bg: 'rgba(90,138,106,0.12)' },
  error:            { label: 'Error',           color: '#8B3A3A', bg: 'rgba(139,58,58,0.08)' },
}

const GARDEN_STATUS: Record<GardenStatus, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pending',    color: '#9A8878', bg: 'rgba(154,136,120,0.1)' },
  generating: { label: 'Generating', color: '#B8874A', bg: 'rgba(184,135,74,0.12)' },
  reviewing:  { label: 'Reviewing',  color: '#9A8878', bg: 'rgba(154,136,120,0.1)' },
  ready:      { label: 'Ready',      color: '#5A8A6A', bg: 'rgba(90,138,106,0.12)' },
  error:      { label: 'Error',      color: '#8B3A3A', bg: 'rgba(139,58,58,0.08)' },
}

interface Props {
  initialVideo: Video
  initialGardens: GardenListItem[]
  /** The week's primary video — passed for the supplementary-video notice. */
  weekPrimary?: VideoListItem | null
  /** True when the viewer is staff (pastor/staff/super_admin). Gates the
   *  download-attempts diagnostics panel for YouTube imports. */
  staffViewer?: boolean
}

export function SermonDetailClient({
  initialVideo,
  initialGardens,
  weekPrimary,
  staffViewer = false,
}: Props) {
  const { addNotification } = useNotifications()
  const router = useRouter()
  const [video, setVideo] = useState(initialVideo)
  const [gardens, setGardens] = useState(initialGardens)
  // Track last-known video status so we can detect the → ready transition
  // without firing on mount (same pattern as SermonListAutoRefresh).
  const prevVideoStatusRef = useRef(initialVideo.status)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [instructions, setInstructions] = useState('')
  const [showTranscript, setShowTranscript] = useState(false)
  const [showManualGenerate, setShowManualGenerate] = useState(false)
  const [showRegenerate, setShowRegenerate] = useState(false)

  // Inline editing — title and date
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(video.title)
  const [editingDate, setEditingDate] = useState(false)
  const [dateDraft, setDateDraft] = useState(video.video_date)
  const [metaSaving, setMetaSaving] = useState(false)
  const [metaError, setMetaError] = useState<string | null>(null)

  async function saveMeta(patch: { title?: string; video_date?: string }) {
    setMetaSaving(true)
    setMetaError(null)
    try {
      const res = await fetch(`/api/videos/${video.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save')
      }
      const updated = await res.json()
      setVideo(updated)
      setTitleDraft(updated.title)
      setDateDraft(updated.video_date)
    } catch (err) {
      setMetaError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setMetaSaving(false)
    }
  }

  // Garden generation always runs for this video's week — the
  // backend gates it on this video being primary for that week.
  // Anchored at the video's week_anchor_sunday + 1 (Monday).
  const weekStartsAt = useMemo(() => {
    const d = new Date(`${video.week_anchor_sunday}T00:00:00`)
    d.setDate(d.getDate() + 1)
    return toISODate(d)
  }, [video.week_anchor_sunday])

  // Saturday of the garden week (week_anchor_sunday + 6).
  const weekSaturday = useMemo(() => {
    const d = new Date(`${video.week_anchor_sunday}T00:00:00`)
    d.setDate(d.getDate() + 6)
    return d
  }, [video.week_anchor_sunday])

  // "Mon, Jun 2 – Sat, Jun 7" label for the primary-video notice.
  const weekRangeLabel = useMemo(() => (
    `${formatGardenDateShort(weekStartsAt)} – ${formatGardenDateShort(toISODate(weekSaturday))}`
  ), [weekStartsAt, weekSaturday])

  // "Wed, May 6 – Sat, May 9" label for the override link.
  const overrideRangeLabel = useMemo(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    if (tomorrow > weekSaturday) return null   // week already over
    return `${fmt(tomorrow)} – ${fmt(weekSaturday)}`
  }, [weekSaturday])

  // "Active" = the row is moving through the pipeline and we should
  // be polling for status / thumbnail updates. Includes the long
  // transcoding phase (MediaConvert) where the row sits for several
  // minutes — without it the page would show a stale processing badge
  // and no thumbnail until the user manually refreshed.
  const videoIsActive =
    video.status === 'pending_upload'
    || video.status === 'downloading'
    || video.status === 'transcoding'
    || video.status === 'uploaded'
    || video.status === 'processing'
  const isProcessing = videoIsActive  // kept for the existing UI banner condition
  const isReady = video.status === 'ready'
  const hasError = video.status === 'error'
  const gardensGenerating = gardens.some((g) => g.status === 'pending' || g.status === 'generating')
  const isPrimary = video.role === 'primary'
  // Primary is ready but no garden rows exist yet — auto-gen task is queued
  // or about to start. Poll until placeholder rows appear.
  const awaitingGardens = isReady && isPrimary && gardens.length === 0 && !generating

  // Poll video status while the row is in any non-terminal state.
  // 15s — short enough that the thumbnail / status badge appears
  // promptly after MediaConvert + Ragie finish, long enough that
  // we're not hammering ragserv during multi-minute transcodes.
  useEffect(() => {
    if (!videoIsActive) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/videos/${video.id}`)
        if (res.ok) {
          const updated = await res.json()
          if (prevVideoStatusRef.current !== 'ready' && updated.status === 'ready') {
            addNotification({ type: 'video_ready', title: updated.title, videoId: updated.id })
          }
          prevVideoStatusRef.current = updated.status
          setVideo(updated)
        }
      } catch { /* ignore polling errors */ }
    }, 15_000)
    return () => clearInterval(interval)
  }, [videoIsActive, video.id, addNotification])

  // Poll garden status while generating
  useEffect(() => {
    if (!gardensGenerating && !generating) return
    const delay = 15_000 // start polling after 15s
    const timeout = setTimeout(() => {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/videos/${video.id}/gardens`)
          if (res.ok) {
            const updated: GardenListItem[] = await res.json()
            setGardens(updated)
            const allDone = updated.every((g) => g.status === 'ready' || g.status === 'error')
            if (allDone) {
              if (updated.some((g) => g.status === 'ready')) {
                addNotification({ type: 'gardens_ready', title: video.title, videoId: video.id })
              }
              setGenerating(false)
              clearInterval(interval)
            }
          }
        } catch { /* ignore */ }
      }, 5_000)
      return () => clearInterval(interval)
    }, delay)
    return () => clearTimeout(timeout)
  }, [gardensGenerating, generating, video.id])

  // Poll for the first garden rows to appear after auto-gen queues them.
  useEffect(() => {
    if (!awaitingGardens) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/videos/${video.id}/gardens`)
        if (res.ok) {
          const updated: GardenListItem[] = await res.json()
          if (updated.length > 0) setGardens(updated)
        }
      } catch { /* ignore */ }
    }, 5_000)
    return () => clearInterval(interval)
  }, [awaitingGardens, video.id])

  const handleGenerateGardens = useCallback(async (force = false) => {
    setGenerating(true)
    setGenError(null)
    try {
      const res = await fetch(`/api/videos/${video.id}/generate-gardens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_starts_at: weekStartsAt,
          ...(instructions ? { instructions } : {}),
          ...(force ? { force: true } : {}),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to generate gardens')
      }
      const newGardens: GardenListItem[] = await res.json()
      setGardens(newGardens)
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed')
      setGenerating(false)
    }
  }, [video.id, instructions, weekStartsAt, gardens.length])

  const s = STATUS_DISPLAY[video.status] ?? STATUS_DISPLAY.pending_upload

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-7 anim-fadeUp">
        <div>
          <p className="section-label mb-2">Sermon</p>

          {/* Editable title */}
          {editingTitle ? (
            <div className="flex items-center gap-2 mb-1">
              <input
                autoFocus
                className="input-warm text-2xl flex-1"
                style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic', color: '#2C1E0F' }}
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { saveMeta({ title: titleDraft }); setEditingTitle(false) }
                  if (e.key === 'Escape') { setTitleDraft(video.title); setEditingTitle(false) }
                }}
              />
              <button
                onClick={() => { saveMeta({ title: titleDraft }); setEditingTitle(false) }}
                disabled={metaSaving}
                className="btn-gold text-xs px-3 py-1.5 shrink-0"
              >Save</button>
              <button
                onClick={() => { setTitleDraft(video.title); setEditingTitle(false) }}
                className="text-xs shrink-0"
                style={{ color: '#9A8878', fontFamily: 'var(--font-mulish)' }}
              >Cancel</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className="text-left group block mb-1"
              title="Click to edit title"
            >
              <h1
                className="text-3xl leading-tight group-hover:opacity-70 transition-opacity"
                style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F', fontStyle: 'italic' }}
              >
                {video.title}
                <span className="ml-2 text-sm opacity-0 group-hover:opacity-50 transition-opacity" style={{ fontStyle: 'normal', fontFamily: 'var(--font-mulish)' }}>✏</span>
              </h1>
            </button>
          )}

          {video.description && (
            <p className="text-sm mt-1.5" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
              {video.description}
            </p>
          )}

          {/* Editable date */}
          <div className="flex items-center gap-2 mt-1">
            {editingDate ? (
              <>
                <input
                  autoFocus
                  type="date"
                  className="input-warm text-xs"
                  value={dateDraft}
                  onChange={e => setDateDraft(e.target.value)}
                  onClick={e => e.stopPropagation()}
                />
                <button
                  onClick={() => { saveMeta({ video_date: dateDraft }); setEditingDate(false) }}
                  disabled={metaSaving}
                  className="btn-gold text-xs px-3 py-1.5 shrink-0"
                >Save</button>
                <button
                  onClick={() => { setDateDraft(video.video_date); setEditingDate(false) }}
                  className="text-xs shrink-0"
                  style={{ color: '#9A8878', fontFamily: 'var(--font-mulish)' }}
                >Cancel</button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditingDate(true)}
                className="group flex items-center gap-1"
                title="Click to edit date"
              >
                <span className="text-xs group-hover:opacity-70 transition-opacity" style={{ color: '#C5B49A', fontFamily: 'var(--font-mulish)' }}>
                  {formatGardenDateLong(video.video_date)}
                  <span className="ml-1 opacity-0 group-hover:opacity-50 transition-opacity">✏</span>
                </span>
              </button>
            )}
            <span className="text-xs" style={{ color: '#D4C4A8', fontFamily: 'var(--font-mulish)' }}>
              · uploaded {new Date(video.created_at).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })}
            </span>
          </div>

          {metaError && (
            <p className="text-xs mt-1" style={{ color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}>{metaError}</p>
          )}
        </div>
        <span
          className="shrink-0 text-xs font-semibold rounded-full px-3 py-1.5 mt-1"
          style={{ background: s.bg, color: s.color, fontFamily: 'var(--font-mulish)' }}
        >
          {s.label}
        </span>
      </div>

      {/* Thumbnail picker — auto-frame candidates + custom upload */}
      <ThumbnailPicker video={video} />

      {/* Primary notifier — shown when this sermon is driving the week's
          garden generation. Read-only; role assignment is managed elsewhere. */}
      {isPrimary && (
        <div
          className="surface px-6 py-4 mb-6 anim-fadeUp flex items-center gap-3"
          style={{
            animationDelay: '0.06s',
            borderColor: 'rgba(90,138,106,0.3)',
            background: 'rgba(90,138,106,0.06)',
          }}
        >
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: '#5A8A6A' }}
          />
          <p className="text-sm" style={{ fontFamily: 'var(--font-mulish)', color: '#3A6A4A' }}>
            This sermon is the primary source for gardens {weekRangeLabel}.
          </p>
        </div>
      )}

      {/* Processing state */}
      {isProcessing && (
        <div
          className="surface px-6 py-5 mb-6 anim-fadeUp"
          style={{ animationDelay: '0.08s' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ background: '#B8874A' }}
            />
            <div>
              <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}>
                Processing video…
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
                This can take a while for longer videos. The page will update automatically.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div
          className="surface px-6 py-5 mb-6 anim-fadeUp"
          style={{ animationDelay: '0.08s', borderColor: 'rgba(139,58,58,0.2)' }}
        >
          <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-mulish)', color: '#8B3A3A' }}>
            Processing failed
          </p>
          {video.error_message && (
            <p className="text-xs mt-1" style={{ color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}>
              {video.error_message}
            </p>
          )}
          {video.youtube_url && (
            <p className="text-xs mt-2" style={{ color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}>
              Try{' '}
              <Link href="/sermons/upload" className="underline">
                uploading the file directly
              </Link>{' '}
              instead.
            </p>
          )}
        </div>
      )}

      {/* YouTube import diagnostics — staff-only, only when this row
          came from yt-dlp. Surfaces each attempt with its classified
          kind, IP family, and egress IP so we can spot rate-limit /
          IP-block patterns. */}
      {staffViewer && video.youtube_url && (
        <DownloadAttemptsPanel videoId={video.id} videoStatus={video.status} />
      )}

      {/* Transcript */}
      {isReady && video.transcript && (
        <div className="surface mb-6 anim-fadeUp" style={{ animationDelay: '0.08s' }}>
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="w-full px-6 py-4 flex items-center justify-between text-left"
          >
            <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}>
              Transcript
            </span>
            <span className="text-xs" style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}>
              {showTranscript ? 'Hide' : 'Show'}
            </span>
          </button>
          {showTranscript && (
            <div
              className="px-6 pb-5 text-sm leading-relaxed max-h-96 overflow-y-auto"
              style={{ color: '#4A3A2A', fontFamily: 'var(--font-mulish)', whiteSpace: 'pre-wrap' }}
            >
              {video.transcript}
            </div>
          )}
        </div>
      )}

      {/* Primary video — awaiting auto-generated gardens */}
      {awaitingGardens && (
        <div className="surface px-6 py-5 mb-6 anim-fadeUp" style={{ animationDelay: '0.12s' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-3 h-3 rounded-full animate-pulse shrink-0" style={{ background: '#B8874A' }} />
            <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}>
              Gardens are generating automatically…
            </p>
          </div>
          <p className="text-xs mb-3" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
            Six daily devotional gardens will appear here once generation completes.
          </p>
          <button
            type="button"
            onClick={() => setShowManualGenerate(v => !v)}
            className="text-xs underline"
            style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            {showManualGenerate ? 'Hide' : 'Generate with custom instructions instead'}
          </button>
          {showManualGenerate && (
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid #EAD9C4' }}>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1" style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}>
                  Instructions <span style={{ color: '#C5B49A' }}>(optional)</span>
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  className="input-warm w-full"
                  placeholder="Any specific focus areas or themes for the daily gardens..."
                />
              </div>
              {genError && (
                <p className="text-sm rounded-lg px-3 py-2 mb-3" style={{ color: '#8B3A3A', background: 'rgba(139,58,58,0.08)', border: '1px solid rgba(139,58,58,0.2)', fontFamily: 'var(--font-mulish)' }}>
                  {genError}
                </p>
              )}
              <button onClick={() => handleGenerateGardens()} className="btn-gold px-5 py-2.5 text-sm">
                Generate Gardens
              </button>
            </div>
          )}
        </div>
      )}

      {/* Supplementary/ignored video — offer to override this week's gardens.
          Only shown while the week is still active (overrideRangeLabel is
          null once Saturday has passed). */}
      {isReady && !isPrimary && overrideRangeLabel && !generating && !gardensGenerating && (
        <div className="surface px-6 py-5 mb-6 anim-fadeUp" style={{ animationDelay: '0.12s' }}>
          {genError && (
            <p
              className="text-sm rounded-lg px-3 py-2 mb-3"
              style={{
                color: '#8B3A3A',
                background: 'rgba(139,58,58,0.08)',
                border: '1px solid rgba(139,58,58,0.2)',
                fontFamily: 'var(--font-mulish)',
              }}
            >
              {genError}
            </p>
          )}
          <p className="text-sm leading-relaxed" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
            This is a supplementary video. Gardens for this week are currently based on the{' '}
            {weekPrimary ? (
              <Link
                href={`/sermons/${weekPrimary.id}`}
                className="underline"
                style={{ color: '#8A7060' }}
              >
                sermon from {formatGardenDateShort(weekPrimary.video_date)}
              </Link>
            ) : (
              'this week\'s primary sermon'
            )}
            {'. '}
            To replace the remaining gardens from {overrideRangeLabel} with this video, you can{' '}
            <button
              onClick={() => handleGenerateGardens(true)}
              className="underline"
              style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              begin regeneration
            </button>
            {' '}now.
          </p>
        </div>
      )}

      {/* Generating state */}
      {(generating || gardensGenerating) && (
        <div className="surface px-6 py-5 mb-6 anim-fadeUp" style={{ animationDelay: '0.12s' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ background: '#B8874A' }}
            />
            <div>
              <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}>
                Generating gardens…
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
                Creating six daily devotional gardens from this sermon. This may take a minute.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gardens list */}
      {gardens.length > 0 && !gardensGenerating && (
        <div className="anim-fadeUp" style={{ animationDelay: '0.16s' }}>
          <p className="section-label mb-3">Gardens</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {gardens
              .slice()
              .sort((a, b) => a.garden_date.localeCompare(b.garden_date))
              .map((garden) => {
                const gs = GARDEN_STATUS[garden.status] ?? GARDEN_STATUS.pending
                return (
                  <Link
                    key={garden.id}
                    href={`/garden/${garden.id}`}
                    className="surface group block p-5 hover:scale-[1.01] transition-transform duration-200"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p
                        className="text-sm font-semibold group-hover:text-[#B8874A] transition-colors"
                        style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}
                      >
                        {formatGardenDateLong(garden.garden_date)}
                      </p>
                      <span
                        className="shrink-0 text-xs font-semibold rounded-full px-2.5 py-0.5"
                        style={{ background: gs.bg, color: gs.color, fontFamily: 'var(--font-mulish)' }}
                      >
                        {gs.label}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
                      {garden.content_json?.title ?? garden.topic}
                    </p>
                  </Link>
                )
              })}
          </div>

          {/* Regenerate — for custom instructions or recovery */}
          {isReady && isPrimary && !generating && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowRegenerate(v => !v)}
                className="text-xs underline"
                style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                {showRegenerate ? 'Hide' : 'Regenerate with custom instructions'}
              </button>
              {showRegenerate && (
                <div className="mt-3 surface px-5 py-4">
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-1" style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}>
                      Instructions <span style={{ color: '#C5B49A' }}>(optional)</span>
                    </label>
                    <textarea
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      rows={3}
                      className="input-warm w-full"
                      placeholder="Any specific focus areas or themes for the daily gardens..."
                    />
                  </div>
                  {genError && (
                    <p className="text-sm rounded-lg px-3 py-2 mb-3" style={{ color: '#8B3A3A', background: 'rgba(139,58,58,0.08)', border: '1px solid rgba(139,58,58,0.2)', fontFamily: 'var(--font-mulish)' }}>
                      {genError}
                    </p>
                  )}
                  <button onClick={() => handleGenerateGardens(true)} className="btn-gold px-5 py-2.5 text-sm">
                    Regenerate Gardens
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Archive sermon — tucked at the bottom; low-visibility by design */}
    </>
  )
}

// ─── Diagnostics panel (staff-only, YouTube imports) ───────────────────────

const OUTCOME_BADGE: Record<
  VideoDownloadAttempt['outcome'],
  { label: string; color: string; bg: string }
> = {
  in_progress: { label: 'In progress', color: '#5878A8', bg: 'rgba(88,120,168,0.1)' },
  succeeded:   { label: 'Succeeded',   color: '#5A8A6A', bg: 'rgba(90,138,106,0.12)' },
  failed:      { label: 'Failed',      color: '#8B3A3A', bg: 'rgba(139,58,58,0.08)' },
}

function DownloadAttemptsPanel({
  videoId,
  videoStatus,
}: {
  videoId: string
  videoStatus: VideoStatus
}) {
  const [attempts, setAttempts] = useState<VideoDownloadAttempt[] | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Poll while the download is active so staff see attempts land
  // in real time. Stop polling on terminal states.
  const stillDownloading =
    videoStatus === 'downloading' || videoStatus === 'pending_upload'

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/videos/${videoId}/download-attempts`)
        if (!res.ok) throw new Error(`Request failed (${res.status})`)
        const rows = (await res.json()) as VideoDownloadAttempt[]
        if (!cancelled) setAttempts(rows)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      }
    }
    load()
    if (!stillDownloading) return
    const id = setInterval(load, 5000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [videoId, stillDownloading])

  // Don't render anything when there's nothing to show — keeps the page
  // tidy for YouTube imports that succeeded on the first attempt with
  // staff not interested in the diagnostics.
  if (attempts !== null && attempts.length === 0 && !error) return null

  return (
    <div
      className="surface mb-6 anim-fadeUp"
      style={{ animationDelay: '0.1s' }}
    >
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full px-6 py-4 flex items-center justify-between text-left"
      >
        <span
          className="text-sm font-semibold"
          style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}
        >
          Download diagnostics
          {attempts !== null && (
            <span
              className="ml-2 text-xs font-normal"
              style={{ color: '#8A7060' }}
            >
              ({attempts.length} attempt{attempts.length === 1 ? '' : 's'})
            </span>
          )}
        </span>
        <span
          className="text-xs"
          style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}
        >
          {expanded ? 'Hide' : 'Show'}
        </span>
      </button>
      {expanded && (
        <div className="px-6 pb-5">
          {error && (
            <p
              className="text-xs mb-3"
              style={{ color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}
            >
              {error}
            </p>
          )}
          {attempts === null && !error && (
            <p
              className="text-xs"
              style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}
            >
              Loading…
            </p>
          )}
          {attempts && attempts.length > 0 && (
            <table className="w-full text-xs" style={{ fontFamily: 'var(--font-mulish)' }}>
              <thead style={{ color: '#8A7060' }}>
                <tr className="text-left">
                  <th className="py-2 pr-3 font-semibold">#</th>
                  <th className="py-2 pr-3 font-semibold">Outcome</th>
                  <th className="py-2 pr-3 font-semibold">Family</th>
                  <th className="py-2 pr-3 font-semibold">Egress IP</th>
                  <th className="py-2 pr-3 font-semibold">Kind</th>
                  <th className="py-2 pr-3 font-semibold">HTTP</th>
                  <th className="py-2 pr-3 font-semibold">yt-dlp</th>
                </tr>
              </thead>
              <tbody style={{ color: '#4A3A2A' }}>
                {attempts.map(a => {
                  const badge = OUTCOME_BADGE[a.outcome]
                  return (
                    <tr key={a.id} style={{ borderTop: '1px solid #EAD9C4' }}>
                      <td className="py-2 pr-3">{a.attempt_number}</td>
                      <td className="py-2 pr-3">
                        <span
                          className="inline-block px-2 py-0.5 rounded text-xs"
                          style={{ color: badge.color, background: badge.bg }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-2 pr-3">{a.ip_family ?? '—'}</td>
                      <td className="py-2 pr-3 font-mono">{a.egress_ip ?? '—'}</td>
                      <td className="py-2 pr-3">{a.kind ?? '—'}</td>
                      <td className="py-2 pr-3">{a.http_status ?? '—'}</td>
                      <td className="py-2 pr-3 font-mono">{a.yt_dlp_version ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
