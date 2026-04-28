'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { Video, VideoStatus, GardenListItem, GardenStatus } from '@/lib/api/types'
import { useNotifications } from '@/lib/notifications'

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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
  reviewing:  { label: 'Reviewing',  color: '#B8874A', bg: 'rgba(184,135,74,0.12)' },
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
  const [generationFailed, setGenerationFailed] = useState(false)
  const [instructions, setInstructions] = useState('')
  const [showTranscript, setShowTranscript] = useState(false)
  const { addNotification } = useNotifications()

  // Track previous statuses so we only fire notifications on transitions
  const prevVideoStatus = useRef(initialVideo.status)
  const gardensNotifiedRef = useRef(false)

  const isProcessing = video.status === 'processing' || video.status === 'uploaded' || video.status === 'downloading'
  const isReady = video.status === 'ready'
  const hasError = video.status === 'error'
  const gardensGenerating = gardens.some((g) => g.status === 'pending' || g.status === 'generating' || g.status === 'reviewing')

  // Poll video status while processing
  useEffect(() => {
    if (!isProcessing) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/videos/${video.id}`)
        if (res.ok) {
          const updated = await res.json()
          setVideo(updated)
          // Notify when video transitions to ready
          if (prevVideoStatus.current !== 'ready' && updated.status === 'ready') {
            addNotification({ type: 'video_ready', title: updated.title, videoId: updated.id })
          }
          prevVideoStatus.current = updated.status
        }
      } catch { /* ignore polling errors */ }
    }, 30_000)
    return () => clearInterval(interval)
  }, [isProcessing, video.id, addNotification])

  // Poll garden status while generating
  useEffect(() => {
    if (!gardensGenerating && !generating) return
    const delay = 15_000 // start polling after 15s
    let intervalId: ReturnType<typeof setInterval>

    const timeout = setTimeout(() => {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`/api/videos/${video.id}/gardens`)
          if (res.ok) {
            const updated: GardenListItem[] = await res.json()
            setGardens(updated)
            const allDone = updated.every((g) => g.status === 'ready' || g.status === 'error')
            if (allDone) {
              setGenerating(false)
              clearInterval(intervalId)
              const anyReady = updated.some((g) => g.status === 'ready')
              const allFailed = updated.every((g) => g.status === 'error')
              if (allFailed) {
                setGenerationFailed(true)
                setGenError('All gardens failed to generate. You can retry below.')
              } else if (anyReady && !gardensNotifiedRef.current) {
                gardensNotifiedRef.current = true
                addNotification({ type: 'gardens_ready', title: video.title, videoId: video.id })
              }
            }
          }
        } catch { /* ignore */ }
      }, 5_000)
    }, delay)

    return () => {
      clearTimeout(timeout)
      clearInterval(intervalId)
    }
  }, [gardensGenerating, generating, video.id, video.title, addNotification])

  const handleGenerateGardens = useCallback(async () => {
    setGenerating(true)
    setGenError(null)
    setGenerationFailed(false)
    gardensNotifiedRef.current = false  // allow notification to fire again for new generation
    try {
      const res = await fetch(`/api/videos/${video.id}/generate-gardens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(instructions ? { instructions } : {}),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to generate gardens')
      }
      const newGardens: GardenListItem[] = await res.json()
      setGardens(newGardens)
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Generation failed'
      // Surface a clear message when backend rejects because gardens already exist
      const msg = raw.toLowerCase().includes('already exist') || raw.toLowerCase().includes('conflict')
        ? 'Gardens already exist for this sermon — the backend does not yet support regeneration. Ask Dan to add a force-regenerate or delete endpoint.'
        : raw
      setGenError(msg)
      setGenerating(false)
      if (gardens.length > 0) setGenerationFailed(true)
    }
  }, [video.id, instructions])

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

      {/* Generate / Regenerate Gardens section */}
      {isReady && !generating && !gardensGenerating && !generationFailed && (
        <div className="surface px-6 py-6 mb-6 anim-fadeUp" style={{ animationDelay: '0.12s' }}>
          <p className="section-label mb-3">{gardens.length > 0 ? 'Regenerate Gardens' : 'Generate Gardens'}</p>
          <p className="text-sm mb-4" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
            {gardens.length > 0
              ? 'Re-run generation to replace the existing gardens with a fresh set.'
              : 'Generate six daily devotional gardens (Monday–Saturday) from this sermon.'}
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
          <button onClick={handleGenerateGardens} className="btn-gold px-5 py-2.5 text-sm">
            {gardens.length > 0 ? 'Regenerate Gardens' : 'Generate Gardens'}
          </button>
        </div>
      )}

      {/* Actively generating */}
      {(generating || gardensGenerating) && !generationFailed && (
        <div className="surface px-6 py-5 mb-6 anim-fadeUp" style={{ animationDelay: '0.12s' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full animate-pulse shrink-0"
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
            <button
              onClick={() => setGenerationFailed(true)}
              className="shrink-0 text-xs font-semibold underline"
              style={{ color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}
            >
              Stuck? Force retry
            </button>
          </div>
        </div>
      )}

      {/* Generation failed */}
      {generationFailed && (
        <div
          className="surface px-6 py-5 mb-6 anim-fadeUp"
          style={{ animationDelay: '0.12s', borderColor: 'rgba(139,58,58,0.25)' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold mb-0.5" style={{ fontFamily: 'var(--font-mulish)', color: '#8B3A3A' }}>
                Generation failed
              </p>
              {genError && (
                <p className="text-xs" style={{ color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}>
                  {genError}
                </p>
              )}
            </div>
            <button
              onClick={handleGenerateGardens}
              className="shrink-0 btn-gold px-4 py-1.5 text-xs"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Gardens list */}
      {gardens.length > 0 && (
        <div className="anim-fadeUp" style={{ animationDelay: '0.16s' }}>
          <p className="section-label mb-3">Gardens</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {gardens
              .sort((a, b) => a.day_number - b.day_number)
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
                        Day {garden.day_number} — {DAY_NAMES[garden.day_number] || `Day ${garden.day_number}`}
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
