'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import type {
  GardenListItem,
  GardenStatus,
  Video,
  VideoListItem,
  VideoRole,
  VideoStatus,
} from '@/lib/api/types'
import {
  formatGardenDateLong,
  toISODate,
} from '@/lib/dates'

const ROLE_LABELS: Record<VideoRole, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  ignored: 'Ignored',
}

const ROLE_DESCRIPTIONS: Record<VideoRole, string> = {
  primary: "Drives this week's gardens.",
  secondary: 'Summary added as supplemental context.',
  ignored: 'Not used for garden generation.',
}

const STATUS_DISPLAY: Record<VideoStatus, { label: string; color: string; bg: string }> = {
  pending_upload: { label: 'Pending Upload', color: '#9A8878', bg: 'rgba(154,136,120,0.1)' },
  downloading:    { label: 'Downloading',    color: '#5878A8', bg: 'rgba(88,120,168,0.1)' },
  uploaded:       { label: 'Uploaded',       color: '#5878A8', bg: 'rgba(88,120,168,0.1)' },
  processing:     { label: 'Processing',    color: '#B8874A', bg: 'rgba(184,135,74,0.12)' },
  ready:          { label: 'Ready',          color: '#5A8A6A', bg: 'rgba(90,138,106,0.12)' },
  error:          { label: 'Error',          color: '#8B3A3A', bg: 'rgba(139,58,58,0.08)' },
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
  /** The week's primary, if this video isn't it. Drives the
   *  "this week's primary is …" banner. Null when the week has no
   *  primary at all (or this video IS the primary). */
  weekPrimary?: VideoListItem | null
}

export function SermonDetailClient({
  initialVideo,
  initialGardens,
  weekPrimary,
}: Props) {
  const [video, setVideo] = useState(initialVideo)
  const [gardens, setGardens] = useState(initialGardens)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [instructions, setInstructions] = useState('')
  const [roleSubmitting, setRoleSubmitting] = useState(false)
  const [roleError, setRoleError] = useState<string | null>(null)
  const [showTranscript, setShowTranscript] = useState(false)

  // Garden generation always runs for this video's week — the
  // backend gates it on this video being primary for that week.
  // Anchored at the video's week_anchor_sunday + 1 (Monday).
  const weekStartsAt = useMemo(() => {
    const d = new Date(`${video.week_anchor_sunday}T00:00:00`)
    d.setDate(d.getDate() + 1)
    return toISODate(d)
  }, [video.week_anchor_sunday])

  const isProcessing = video.status === 'processing' || video.status === 'uploaded'
  const isReady = video.status === 'ready'
  const hasError = video.status === 'error'
  const gardensGenerating = gardens.some((g) => g.status === 'pending' || g.status === 'generating')
  const gardensStale = gardens.some((g) => g.is_stale)
  const isPrimary = video.role === 'primary'

  // Poll video status while processing
  useEffect(() => {
    if (!isProcessing) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/videos/${video.id}`)
        if (res.ok) {
          const updated = await res.json()
          setVideo(updated)
        }
      } catch { /* ignore polling errors */ }
    }, 30_000)
    return () => clearInterval(interval)
  }, [isProcessing, video.id])

  // Poll garden status while generating
  useEffect(() => {
    if (!gardensGenerating && !generating) return
    let delay = 15_000 // start polling after 15s
    const timeout = setTimeout(() => {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/videos/${video.id}/gardens`)
          if (res.ok) {
            const updated: GardenListItem[] = await res.json()
            setGardens(updated)
            const allDone = updated.every((g) => g.status === 'ready' || g.status === 'error')
            if (allDone) {
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

  const handleGenerateGardens = useCallback(async () => {
    setGenerating(true)
    setGenError(null)
    try {
      const res = await fetch(`/api/videos/${video.id}/generate-gardens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_starts_at: weekStartsAt,
          // When regenerating after staleness, force=true wipes the
          // old rows and recreates with the current primary's
          // transcript + secondary set.
          ...(gardens.length > 0 ? { force: true } : {}),
          ...(instructions ? { instructions } : {}),
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

  const handleRoleChange = useCallback(
    async (newRole: VideoRole) => {
      if (newRole === video.role) return
      setRoleSubmitting(true)
      setRoleError(null)
      try {
        const res = await fetch(`/api/videos/${video.id}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Failed to update role')
        }
        const updated: Video = await res.json()
        setVideo(updated)
        // The backend may have flipped is_stale on existing gardens;
        // re-fetch so the UI matches without a full page reload.
        try {
          const gres = await fetch(`/api/videos/${video.id}/gardens`)
          if (gres.ok) setGardens(await gres.json())
        } catch { /* ignore */ }
      } catch (err) {
        setRoleError(err instanceof Error ? err.message : 'Role update failed')
      } finally {
        setRoleSubmitting(false)
      }
    },
    [video.id, video.role],
  )

  const s = STATUS_DISPLAY[video.status] ?? STATUS_DISPLAY.pending_upload

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-7 anim-fadeUp">
        <div>
          <p className="section-label mb-2">Sermon</p>
          <h1
            className="text-3xl leading-tight"
            style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F', fontStyle: 'italic' }}
          >
            {video.title}
          </h1>
          {video.description && (
            <p className="text-sm mt-1.5" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
              {video.description}
            </p>
          )}
          <p className="text-xs mt-1" style={{ color: '#C5B49A', fontFamily: 'var(--font-mulish)' }}>
            {formatGardenDateLong(video.video_date)}{' '}
            <span style={{ color: '#D4C4A8' }}>
              · uploaded {new Date(video.created_at).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })}
            </span>
          </p>
        </div>
        <span
          className="shrink-0 text-xs font-semibold rounded-full px-3 py-1.5 mt-1"
          style={{ background: s.bg, color: s.color, fontFamily: 'var(--font-mulish)' }}
        >
          {s.label}
        </span>
      </div>

      {/* Role picker — staff designate which video drives the week's
          gardens. The 3-way choice is always available; the backend
          enforces invariants (one primary per week, etc). */}
      <div className="surface px-6 py-5 mb-6 anim-fadeUp" style={{ animationDelay: '0.06s' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="section-label">Role this week</p>
          {weekPrimary && !isPrimary && (
            <Link
              href={`/sermons/${weekPrimary.id}`}
              className="text-xs underline"
              style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}
            >
              This week&apos;s primary: {weekPrimary.title}
            </Link>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(ROLE_LABELS) as VideoRole[]).map((r) => {
            const active = r === video.role
            return (
              <button
                key={r}
                onClick={() => handleRoleChange(r)}
                disabled={roleSubmitting || active}
                className="rounded-lg px-3 py-2 text-sm font-semibold border transition-colors disabled:cursor-default"
                style={{
                  fontFamily: 'var(--font-mulish)',
                  background: active ? 'rgba(184,135,74,0.15)' : 'rgba(255,255,255,0.4)',
                  borderColor: active ? '#B8874A' : '#EAD9C4',
                  color: active ? '#B8874A' : '#2C1E0F',
                }}
              >
                {ROLE_LABELS[r]}
              </button>
            )
          })}
        </div>
        <p className="text-xs mt-2" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
          {ROLE_DESCRIPTIONS[video.role]}
        </p>
        {roleError && (
          <p
            className="text-sm rounded-lg px-3 py-2 mt-3"
            style={{
              color: '#8B3A3A',
              background: 'rgba(139,58,58,0.08)',
              border: '1px solid rgba(139,58,58,0.2)',
              fontFamily: 'var(--font-mulish)',
            }}
          >
            {roleError}
          </p>
        )}
      </div>

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
        </div>
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

      {/* Generate / Regenerate Gardens section. Visible whenever:
          - Video is ready AND no gardens exist yet (initial generate), OR
          - Video is ready AND gardens are stale (regenerate to pick up
            the new primary / transcript / secondary set).
          Generation is gated server-side on this video being primary
          for the week — the role picker above is the way out. */}
      {isReady && (gardens.length === 0 || gardensStale) && !generating && !gardensGenerating && (
        <div className="surface px-6 py-6 mb-6 anim-fadeUp" style={{ animationDelay: '0.12s' }}>
          <p className="section-label mb-3">
            {gardensStale ? 'Regenerate Gardens' : 'Generate Gardens'}
          </p>
          <p className="text-sm mb-4" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
            Six daily devotional gardens (Monday–Saturday) for the week of{' '}
            <strong style={{ color: '#2C1E0F' }}>{formatGardenDateLong(weekStartsAt)}</strong>.
            {gardensStale && (
              <> The primary or its supporting context changed — regeneration will replace the existing gardens with the latest content.</>
            )}
            {!isPrimary && (
              <>{' '}<span style={{ color: '#8B3A3A' }}>This sermon isn&apos;t the week&apos;s primary; mark it primary above first.</span></>
            )}
          </p>
          <div className="mb-4">
            <label
              className="block text-sm font-medium mb-1"
              style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}
            >
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
          <button
            onClick={handleGenerateGardens}
            disabled={!isPrimary}
            className="btn-gold px-5 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {gardensStale ? 'Regenerate Gardens' : 'Generate Gardens'}
          </button>
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

      {/* Stale badge — visible when any garden in the week is stale.
          Pairs with the Regenerate CTA above. */}
      {gardensStale && !generating && !gardensGenerating && (
        <div
          className="surface px-6 py-3 mb-4 anim-fadeUp flex items-center gap-3"
          style={{
            animationDelay: '0.14s',
            borderColor: 'rgba(184,135,74,0.3)',
            background: 'rgba(184,135,74,0.06)',
          }}
        >
          <span
            className="text-xs font-semibold rounded-full px-2.5 py-0.5"
            style={{
              background: 'rgba(184,135,74,0.18)',
              color: '#8A5A20',
              fontFamily: 'var(--font-mulish)',
            }}
          >
            Stale
          </span>
          <p className="text-xs" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
            The week&apos;s primary or its supporting context changed since these
            gardens were generated. Regenerate above to pick up the latest content.
          </p>
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
                      {garden.topic}
                    </p>
                  </Link>
                )
              })}
          </div>
        </div>
      )}
    </>
  )
}
