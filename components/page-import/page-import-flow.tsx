'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type {
  DiscoveredPageVideo,
  PageDiscoverResult,
  PageQueueResult,
  VideoPlatform,
} from '@/lib/api/types'

type Phase = 'idle' | 'discovering' | 'review' | 'queuing' | 'done'

/**
 * Single-screen flow for importing sermons off a web page:
 *
 *   idle        → URL input + "Find videos"
 *   discovering → spinner while ragserv scrapes the page
 *   review      → discovered videos, platform badges, checkboxes
 *   queuing     → POSTing the selected URLs
 *   done        → summary + link to the Downloads dashboard
 *
 * No polling: discover + queue are two stateless calls. Once queued, each
 * video is a normal download tracked on /downloads.
 */
export function PageImportFlow() {
  const [pageUrl, setPageUrl] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<PageDiscoverResult | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [queued, setQueued] = useState<PageQueueResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const trimmed = pageUrl.trim()
  const normalizedUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  const looksValid = trimmed.length > 3 && trimmed.includes('.') && !/\s/.test(trimmed)
  const busy = phase === 'discovering' || phase === 'queuing'

  async function handleDiscover(e: React.FormEvent) {
    e.preventDefault()
    if (!looksValid || busy) return
    setPhase('discovering')
    setError(null)
    setQueued(null)
    try {
      const res = await fetch('/api/page-imports/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_url: normalizedUrl }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
      const data = body as PageDiscoverResult
      setResult(data)
      // Pre-select everything not already imported.
      setSelected(new Set(data.videos.filter(v => !v.already_imported).map(v => v.url)))
      setPhase('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan page')
      setPhase('idle')
    }
  }

  async function handleQueue() {
    if (selected.size === 0 || busy) return
    setPhase('queuing')
    setError(null)
    try {
      const res = await fetch('/api/page-imports/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_urls: Array.from(selected),
          page_url: result?.page_url,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
      setQueued(body as PageQueueResult)
      setPhase('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue videos')
      setPhase('review')
    }
  }

  function reset() {
    setPageUrl('')
    setResult(null)
    setSelected(new Set())
    setQueued(null)
    setError(null)
    setPhase('idle')
  }

  if (phase === 'done' && queued) {
    return <DoneView queued={queued} onReset={reset} />
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleDiscover} className="surface p-6 space-y-3">
        <FieldLabel>Web page URL</FieldLabel>
        <input
          type="text"
          value={pageUrl}
          onChange={e => setPageUrl(e.target.value)}
          disabled={busy}
          placeholder="https://www.therockmontana.com/sermons"
          className="input-warm w-full"
          autoComplete="off"
        />
        <p className="text-xs" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
          We&apos;ll scan the page for YouTube and Vimeo videos it links to or embeds.
        </p>
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={!looksValid || busy}
            className="btn-gold px-6 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {phase === 'discovering' ? 'Scanning…' : 'Find videos'}
          </button>
        </div>
      </form>

      {error && <ErrorBox>{error}</ErrorBox>}

      {phase === 'review' && result && (
        <ReviewView
          result={result}
          selected={selected}
          setSelected={setSelected}
          onQueue={handleQueue}
          queuing={false}
        />
      )}
      {phase === 'queuing' && result && (
        <ReviewView
          result={result}
          selected={selected}
          setSelected={setSelected}
          onQueue={handleQueue}
          queuing={true}
        />
      )}
    </div>
  )
}

function ReviewView({
  result,
  selected,
  setSelected,
  onQueue,
  queuing,
}: {
  result: PageDiscoverResult
  selected: Set<string>
  setSelected: (next: Set<string>) => void
  onQueue: () => void
  queuing: boolean
}) {
  const selectable = useMemo(
    () => result.videos.filter(v => !v.already_imported),
    [result.videos],
  )

  if (result.videos.length === 0) {
    return (
      <div
        className="surface p-6 text-sm"
        style={{ color: '#5A4530', fontFamily: 'var(--font-mulish)' }}
      >
        <p className="font-semibold mb-1">No videos found on that page.</p>
        <p className="text-xs" style={{ color: '#7A6A58' }}>
          We look for YouTube and Vimeo links and embeds.
          {result.parse_error_count > 0 &&
            ` (${result.parse_error_count} element${result.parse_error_count === 1 ? '' : 's'} couldn't be parsed.)`}
        </p>
      </div>
    )
  }

  const toggle = (url: string) => {
    const next = new Set(selected)
    if (next.has(url)) next.delete(url)
    else next.add(url)
    setSelected(next)
  }

  return (
    <div className="space-y-4">
      <div
        className="surface p-4 flex items-center justify-between text-sm"
        style={{ fontFamily: 'var(--font-mulish)', color: '#5A4530' }}
      >
        <span>
          <span className="font-semibold">{result.found_count}</span> found
          {result.duplicate_count > 0 && ` · ${result.duplicate_count} already imported`}
          {result.parse_error_count > 0 && ` · ${result.parse_error_count} unparseable`}
        </span>
        <div className="space-x-3">
          <button
            type="button"
            onClick={() => setSelected(new Set(selectable.map(v => v.url)))}
            className="text-xs underline"
            disabled={queuing}
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-xs underline"
            disabled={queuing}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="surface p-0 overflow-hidden">
        <table className="w-full text-sm" style={{ fontFamily: 'var(--font-mulish)' }}>
          <thead style={{ background: 'rgba(225,210,180,0.18)' }}>
            <tr>
              <th className="px-3 py-2 text-left w-8"></th>
              <th className="px-3 py-2 text-left w-24">Source</th>
              <th className="px-3 py-2 text-left">Video</th>
              <th className="px-3 py-2 text-left w-36">Status</th>
            </tr>
          </thead>
          <tbody>
            {result.videos.map(video => (
              <ReviewRow
                key={video.url}
                video={video}
                checked={selected.has(video.url)}
                onToggle={toggle}
                disabled={queuing}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onQueue}
          disabled={queuing || selected.size === 0}
          className="btn-gold px-6 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {queuing ? 'Queuing…' : `Queue ${selected.size} video${selected.size === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  )
}

function ReviewRow({
  video,
  checked,
  onToggle,
  disabled,
}: {
  video: DiscoveredPageVideo
  checked: boolean
  onToggle: (url: string) => void
  disabled: boolean
}) {
  const canCheck = !video.already_imported && !disabled
  return (
    <tr style={{ borderTop: '1px solid rgba(225,210,180,0.3)' }}>
      <td className="px-3 py-2 align-top">
        <input
          type="checkbox"
          checked={checked}
          disabled={!canCheck}
          onChange={() => onToggle(video.url)}
          aria-label={video.title ?? video.url}
        />
      </td>
      <td className="px-3 py-2 align-top">
        <PlatformBadge platform={video.platform} />
      </td>
      <td className="px-3 py-2 align-top">
        <a
          href={video.url}
          target="_blank"
          rel="noreferrer"
          className="underline break-all"
          style={{ color: '#2C1E0F' }}
        >
          {video.title || video.url}
        </a>
      </td>
      <td className="px-3 py-2 align-top text-xs">
        {video.already_imported && (
          <Badge bg="rgba(170,150,90,0.18)" color="#7A6020">
            Already imported
          </Badge>
        )}
      </td>
    </tr>
  )
}

function DoneView({
  queued,
  onReset,
}: {
  queued: PageQueueResult
  onReset: () => void
}) {
  return (
    <div className="surface p-6 anim-fadeUp space-y-3" style={{ fontFamily: 'var(--font-mulish)' }}>
      <p className="text-lg font-semibold" style={{ color: '#3D6B3D' }}>
        Queued {queued.queued_count} video{queued.queued_count === 1 ? '' : 's'}.
      </p>
      <p className="text-sm" style={{ color: '#5A4530' }}>
        {queued.skipped_duplicate_count > 0 &&
          `${queued.skipped_duplicate_count} already imported. `}
        {queued.invalid_count > 0 && `${queued.invalid_count} weren't recognized. `}
        They&apos;ll download in the background.
      </p>
      <div className="flex items-center gap-4 pt-1">
        <Link href="/downloads" className="btn-gold px-5 py-2 text-sm font-semibold">
          Track on Downloads →
        </Link>
        <button type="button" onClick={onReset} className="text-sm underline" style={{ color: '#7A6A58' }}>
          Import another page
        </button>
      </div>
    </div>
  )
}

// ── Bits ────────────────────────────────────────────────────────────

function PlatformBadge({ platform }: { platform: VideoPlatform }) {
  const map: Record<VideoPlatform, { bg: string; color: string; label: string }> = {
    youtube: { bg: 'rgba(196,48,43,0.12)', color: '#A12B26', label: 'YouTube' },
    vimeo: { bg: 'rgba(26,150,200,0.14)', color: '#1A6E8E', label: 'Vimeo' },
  }
  const { bg, color, label } = map[platform]
  return (
    <Badge bg={bg} color={color}>
      {label}
    </Badge>
  )
}

function Badge({
  bg,
  color,
  children,
}: {
  bg: string
  color: string
  children: React.ReactNode
}) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
      style={{ background: bg, color, fontFamily: 'var(--font-mulish)' }}
    >
      {children}
    </span>
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

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs px-3 py-2 rounded"
      style={{
        color: '#8B3A3A',
        background: 'rgba(139,58,58,0.08)',
        border: '1px solid rgba(139,58,58,0.2)',
        fontFamily: 'var(--font-mulish)',
      }}
    >
      {children}
    </p>
  )
}
