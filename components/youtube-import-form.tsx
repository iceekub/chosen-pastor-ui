'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toISODate } from '@/lib/dates'

type ItemState = 'idle' | 'submitting' | 'ok' | 'error'

// Accept the common YouTube + Facebook URL shapes the pastor will paste.
// Surface-level validation only — yt-dlp accepts plenty more (Vimeo,
// Twitch, etc.); the server-side download covers the long tail.
const ACCEPTABLE_URL_RE =
  /^https?:\/\/(www\.|m\.|web\.)?(youtube\.com|youtu\.be|facebook\.com|fb\.watch)\//i

export function YouTubeImportForm() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [serviceDate, setServiceDate] = useState(toISODate(new Date()))
  const [state, setState] = useState<ItemState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)

  const busy = state === 'submitting'
  const validUrl = url.trim().length > 0 && ACCEPTABLE_URL_RE.test(url.trim())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validUrl || busy) return
    setState('submitting')
    setError(null)
    try {
      const res = await fetch('/api/videos/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtube_url: url.trim(),
          title: title.trim() || undefined,
          video_date: serviceDate || undefined,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body.error || `Request failed (${res.status})`)
      }
      setCreatedId(body.video_id)
      setState('ok')
      router.push(`/sermons/${body.video_id}`)
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Import failed')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <FieldLabel>YouTube or Facebook URL</FieldLabel>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          disabled={busy}
          placeholder="https://www.youtube.com/watch?v=…"
          className="input-warm w-full"
          inputMode="url"
          autoComplete="off"
          required
        />
        {url.trim().length > 0 && !validUrl && (
          <p
            className="text-xs mt-1"
            style={{ color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}
          >
            Paste a full YouTube or Facebook video URL.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>
            Title{' '}
            <span style={{ color: '#C5B49A', textTransform: 'none', letterSpacing: 0 }}>
              (optional)
            </span>
          </FieldLabel>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={busy}
            placeholder="Defaults to the video's title"
            className="input-warm w-full"
          />
        </div>
        <div>
          <FieldLabel>Sermon date</FieldLabel>
          <input
            type="date"
            defaultValue={serviceDate}
            onChange={e => e.target.value && setServiceDate(e.target.value)}
            disabled={busy}
            className="input-warm w-full"
          />
        </div>
      </div>

      {state === 'error' && error && (
        <div
          className="text-xs rounded px-2 py-1.5"
          style={{
            color: '#8B3A3A',
            background: 'rgba(139,58,58,0.08)',
            border: '1px solid rgba(139,58,58,0.2)',
            fontFamily: 'var(--font-mulish)',
          }}
        >
          {error}{' '}
          <Link href="/sermons/upload" className="underline">
            Upload the file directly instead
          </Link>
          .
        </div>
      )}

      {state === 'ok' && createdId && (
        <p
          className="text-xs"
          style={{ color: '#5A8A6A', fontFamily: 'var(--font-mulish)' }}
        >
          Import started — opening sermon page…
        </p>
      )}

      <div className="flex items-center justify-between pt-1">
        <p
          className="text-xs"
          style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}
        >
          We&apos;ll download from the source and run the same transcode pipeline. Takes a few minutes.
        </p>
        <button
          type="submit"
          disabled={!validUrl || busy}
          className="btn-gold px-6 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Importing…' : 'Import'}
        </button>
      </div>
    </form>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs font-semibold mb-1"
      style={{
        color: '#8A7060',
        fontFamily: 'var(--font-mulish)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </p>
  )
}
