'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { Video, VideoStatus, GardenListItem, GardenStatus } from '@/lib/api/types'
import {
  formatGardenDateLong,
  isMondayISO,
  thisWeeksMondayISO,
} from '@/lib/dates'

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
}

export function SermonDetailClient({ initialVideo, initialGardens }: Props) {
  const [video, setVideo] = useState(initialVideo)
  const [gardens, setGardens] = useState(initialGardens)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [instructions, setInstructions] = useState('')
  // Defaults to this week's Monday so the form is usable in one click;
  // the pastor can pick a future Monday to schedule weeks ahead.
  const [weekStartsAt, setWeekStartsAt] = useState(() => thisWeeksMondayISO())
  const [showTranscript, setShowTranscript] = useState(false)
  const weekStartsAtIsMonday = isMondayISO(weekStartsAt)

  const isProcessing = video.status === 'processing' || video.status === 'uploaded'
  const isReady = video.status === 'ready'
  const hasError = video.status === 'error'
  const gardensGenerating = gardens.some((g) => g.status === 'pending' || g.status === 'generating')

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
    if (!isMondayISO(weekStartsAt)) {
      setGenError('Please pick a Monday — gardens run Mon–Sat for that week.')
      return
    }
    setGenerating(true)
    setGenError(null)
    try {
      const res = await fetch(`/api/videos/${video.id}/generate-gardens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_starts_at: weekStartsAt,
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
  }, [video.id, instructions, weekStartsAt])

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
            Uploaded {new Date(video.created_at).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            })}
          </p>
        </div>
        <span
          className="shrink-0 text-xs font-semibold rounded-full px-3 py-1.5 mt-1"
          style={{ background: s.bg, color: s.color, fontFamily: 'var(--font-mulish)' }}
        >
          {s.label}
        </span>
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

      {/* Generate Gardens section */}
      {isReady && gardens.length === 0 && !generating && (
        <div className="surface px-6 py-6 mb-6 anim-fadeUp" style={{ animationDelay: '0.12s' }}>
          <p className="section-label mb-3">Generate Gardens</p>
          <p className="text-sm mb-4" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
            Generate six daily devotional gardens (Monday–Saturday) from this sermon for the week starting on the Monday you choose.
          </p>
          <div className="mb-4">
            <label
              className="block text-sm font-medium mb-1"
              style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}
            >
              Week starts (Monday)
            </label>
            <input
              type="date"
              value={weekStartsAt}
              onChange={(e) => setWeekStartsAt(e.target.value)}
              className="input-warm w-full"
            />
            {!weekStartsAtIsMonday && (
              <p
                className="text-xs mt-1"
                style={{ color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}
              >
                Pick a Monday — gardens run Mon–Sat for that week.
              </p>
            )}
          </div>
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
            disabled={!weekStartsAtIsMonday}
            className="btn-gold px-5 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate Gardens
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
