'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type {
  BulkImportItemOutcome,
  BulkImportJobDetail,
  BulkImportJobItem,
  BulkImportJobStatus,
} from '@/lib/api/types'
import { formatGardenDateShort } from '@/lib/dates'

const POLL_INTERVAL_MS = 5_000

const ACTIVE_STATUSES: ReadonlySet<BulkImportJobStatus> = new Set([
  'discovering',
  'queued',
  'running',
])

const TERMINAL_STATUSES: ReadonlySet<BulkImportJobStatus> = new Set([
  'discovery_failed',
  'stopped',
  'completed',
])

interface Props {
  initialJob: BulkImportJobDetail
}

/**
 * Drives the review (phase 2) and progress (phase 3) screens. Phase
 * dispatch is by `job.status`:
 *
 *   discovering        → spinner ("scanning channel…")
 *   discovery_failed   → error + restart link
 *   awaiting_review    → checkbox table + Start button
 *   queued/running     → progress + Stop button + polling
 *   stopped/completed  → summary + retry links
 */
export function BulkImportFlow({ initialJob }: Props) {
  const [job, setJob] = useState<BulkImportJobDetail>(initialJob)
  const [polling, setPolling] = useState(false)
  const pollTimer = useRef<number | null>(null)

  // Poll whenever the job is in an active state. Stops automatically
  // when the status moves to terminal or awaiting_review.
  const shouldPoll =
    ACTIVE_STATUSES.has(job.status) || job.status === 'awaiting_review' && false

  const refresh = useCallback(async () => {
    try {
      setPolling(true)
      const res = await fetch(`/api/bulk-imports/${job.id}`, {
        cache: 'no-store',
      })
      if (!res.ok) return
      const next = (await res.json()) as BulkImportJobDetail
      setJob(next)
    } finally {
      setPolling(false)
    }
  }, [job.id])

  useEffect(() => {
    if (!shouldPoll) return
    pollTimer.current = window.setInterval(refresh, POLL_INTERVAL_MS)
    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current)
        pollTimer.current = null
      }
    }
  }, [shouldPoll, refresh])

  if (job.status === 'discovering') return <DiscoveringBanner />
  if (job.status === 'discovery_failed') return <DiscoveryFailedBanner job={job} />
  if (job.status === 'awaiting_review')
    return <ReviewView job={job} onChange={setJob} />
  return <ProgressView job={job} polling={polling} onStop={refresh} />
}

// ── Phase shims ─────────────────────────────────────────────────────


function DiscoveringBanner() {
  return (
    <div
      className="surface p-6 anim-fadeUp"
      style={{ color: '#5A4530', fontFamily: 'var(--font-mulish)' }}
    >
      <p className="font-semibold mb-1">Scanning channel…</p>
      <p className="text-sm" style={{ color: '#7A6A58' }}>
        yt-dlp is fetching the listing; this usually takes 10–30 seconds.
        The page will update automatically.
      </p>
    </div>
  )
}


function DiscoveryFailedBanner({ job }: { job: BulkImportJobDetail }) {
  return (
    <div
      className="surface p-6 anim-fadeUp"
      style={{
        borderColor: 'rgba(139,58,58,0.2)',
        color: '#5A4530',
        fontFamily: 'var(--font-mulish)',
      }}
    >
      <p className="font-semibold mb-2" style={{ color: '#8B3A3A' }}>
        Couldn&apos;t scan that channel.
      </p>
      <p className="text-sm mb-3">{job.discovery_error || 'Unknown error.'}</p>
      <p className="text-xs" style={{ color: '#7A6A58' }}>
        Double-check the URL and{' '}
        <Link href="/sermons/bulk-import" className="underline">
          try again
        </Link>
        .
      </p>
    </div>
  )
}


// ── Phase 2: review ────────────────────────────────────────────────


function ReviewView({
  job,
  onChange,
}: {
  job: BulkImportJobDetail
  onChange: (next: BulkImportJobDetail) => void
}) {
  // Selection is local state seeded from is_selected — staff can
  // toggle freely before clicking Start. Skipped duplicates aren't
  // selectable; the checkbox is just shown disabled with a badge.
  const initialSelected = useMemo(() => {
    const set = new Set<string>()
    for (const item of job.items) {
      if (item.is_selected && item.outcome === 'pending') set.add(item.id)
    }
    return set
  }, [job.items])

  const [selected, setSelected] = useState<Set<string>>(initialSelected)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectableItems = job.items.filter(i => i.outcome === 'pending')
  const recommendedIds = selectableItems
    .filter(i => i.is_recommended)
    .map(i => i.id)

  const selectAllRecommended = () => setSelected(new Set(recommendedIds))
  const clearAll = () => setSelected(new Set())

  // Group items by week_anchor_sunday for the table header rows. Items
  // without an upload_date go into a synthetic "no date" group.
  const grouped = useMemo(() => groupByWeek(job.items), [job.items])

  async function handleStart() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/bulk-imports/${job.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_item_ids: Array.from(selected) }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body.error || `Request failed (${res.status})`)
      }
      onChange({ ...job, ...body, items: job.items })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="surface p-4 flex items-center justify-between text-sm"
        style={{ fontFamily: 'var(--font-mulish)', color: '#5A4530' }}
      >
        <span>
          <span className="font-semibold">{selected.size}</span> selected of{' '}
          {selectableItems.length} candidates ({recommendedIds.length} recommended)
        </span>
        <div className="space-x-3">
          <button
            type="button"
            onClick={selectAllRecommended}
            className="text-xs underline"
            disabled={submitting}
          >
            Select all recommended
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs underline"
            disabled={submitting}
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
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left w-28">Date</th>
              <th className="px-3 py-2 text-left w-20">Length</th>
              <th className="px-3 py-2 text-left w-36">Status</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(group => (
              <ReviewGroup
                key={group.key}
                label={group.label}
                items={group.items}
                selected={selected}
                onToggle={toggle}
                disabled={submitting}
              />
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <p
          className="text-xs px-3 py-2 rounded"
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

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleStart}
          disabled={submitting || selected.size === 0}
          className="btn-gold px-6 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Starting…' : `Start ${selected.size} downloads`}
        </button>
      </div>
    </div>
  )
}


function ReviewGroup({
  label,
  items,
  selected,
  onToggle,
  disabled,
}: {
  label: string
  items: BulkImportJobItem[]
  selected: Set<string>
  onToggle: (id: string) => void
  disabled: boolean
}) {
  return (
    <>
      <tr style={{ background: 'rgba(225,210,180,0.08)' }}>
        <td colSpan={5} className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: '#8A7060' }}>
          {label}
        </td>
      </tr>
      {items.map(item => (
        <ReviewRow
          key={item.id}
          item={item}
          checked={selected.has(item.id)}
          onToggle={onToggle}
          disabled={disabled}
        />
      ))}
    </>
  )
}


function ReviewRow({
  item,
  checked,
  onToggle,
  disabled,
}: {
  item: BulkImportJobItem
  checked: boolean
  onToggle: (id: string) => void
  disabled: boolean
}) {
  const isDuplicate = item.outcome === 'skipped_duplicate'
  const canCheck = item.outcome === 'pending' && !disabled

  return (
    <tr style={{ borderTop: '1px solid rgba(225,210,180,0.3)' }}>
      <td className="px-3 py-2 align-top">
        <input
          type="checkbox"
          checked={checked}
          disabled={!canCheck}
          onChange={() => onToggle(item.id)}
          aria-label={item.title ?? item.youtube_video_id}
        />
      </td>
      <td className="px-3 py-2 align-top">
        <a
          href={item.youtube_url}
          target="_blank"
          rel="noreferrer"
          className="underline"
          style={{ color: '#2C1E0F' }}
        >
          {item.title || item.youtube_video_id}
        </a>
      </td>
      <td className="px-3 py-2 align-top text-xs" style={{ color: '#7A6A58' }}>
        {item.upload_date ? formatGardenDateShort(item.upload_date) : '—'}
      </td>
      <td className="px-3 py-2 align-top text-xs" style={{ color: '#7A6A58' }}>
        {formatDuration(item.duration_seconds)}
      </td>
      <td className="px-3 py-2 align-top text-xs">
        <Badges item={item} isDuplicate={isDuplicate} />
      </td>
    </tr>
  )
}


function Badges({
  item,
  isDuplicate,
}: {
  item: BulkImportJobItem
  isDuplicate: boolean
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {item.is_recommended && (
        <Badge bg="rgba(95,140,95,0.15)" color="#3D6B3D">
          Recommended
        </Badge>
      )}
      {isDuplicate && (
        <Badge bg="rgba(170,150,90,0.18)" color="#7A6020">
          Already imported
        </Badge>
      )}
    </div>
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


// ── Phase 3: progress ──────────────────────────────────────────────


function ProgressView({
  job,
  polling,
  onStop,
}: {
  job: BulkImportJobDetail
  polling: boolean
  onStop: () => void
}) {
  const counts = useMemo(() => countByOutcome(job.items), [job.items])
  const total = job.items.filter(i => i.is_selected).length
  const done = counts.completed + counts.failed + counts.cancelled
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  const [stopping, setStopping] = useState(false)
  const [stopError, setStopError] = useState<string | null>(null)

  const isTerminal = TERMINAL_STATUSES.has(job.status)

  async function handleStop() {
    const ok = window.confirm(
      'Stop the import? The current download finishes (we can\'t abort it mid-stream); remaining items get cancelled.',
    )
    if (!ok) return
    setStopping(true)
    setStopError(null)
    try {
      const res = await fetch(`/api/bulk-imports/${job.id}/stop`, {
        method: 'POST',
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body.error || `Request failed (${res.status})`)
      }
      onStop()
    } catch (err) {
      setStopError(err instanceof Error ? err.message : 'Failed to stop')
    } finally {
      setStopping(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="surface p-4"
        style={{ fontFamily: 'var(--font-mulish)', color: '#5A4530' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs uppercase tracking-wide" style={{ color: '#8A7060' }}>
              Status
            </p>
            <p className="text-lg font-semibold capitalize">{job.status}</p>
          </div>
          {!isTerminal && (
            <button
              type="button"
              onClick={handleStop}
              disabled={stopping}
              className="text-sm px-3 py-1.5 rounded font-semibold"
              style={{
                color: '#8B3A3A',
                background: 'rgba(139,58,58,0.08)',
                border: '1px solid rgba(139,58,58,0.2)',
              }}
            >
              {stopping ? 'Stopping…' : 'Stop'}
            </button>
          )}
        </div>

        <div
          className="w-full h-2 rounded overflow-hidden"
          style={{ background: 'rgba(225,210,180,0.4)' }}
        >
          <div
            className="h-full transition-all"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg,#B79552,#8E6D2D)',
            }}
          />
        </div>
        <p className="text-xs mt-2" style={{ color: '#7A6A58' }}>
          {counts.completed} succeeded · {counts.failed} failed ·{' '}
          {counts.cancelled} cancelled · {counts.pending + counts.running}{' '}
          remaining ({total} selected)
          {polling && ' · refreshing…'}
        </p>
        {job.consecutive_failures > 0 && !isTerminal && (
          <p className="text-xs mt-1" style={{ color: '#8B3A3A' }}>
            {job.consecutive_failures} consecutive failure
            {job.consecutive_failures === 1 ? '' : 's'} (threshold{' '}
            {job.consecutive_failure_threshold})
          </p>
        )}
      </div>

      {stopError && (
        <p
          className="text-xs px-3 py-2 rounded"
          style={{
            color: '#8B3A3A',
            background: 'rgba(139,58,58,0.08)',
            border: '1px solid rgba(139,58,58,0.2)',
            fontFamily: 'var(--font-mulish)',
          }}
        >
          {stopError}
        </p>
      )}

      <div className="surface p-0 overflow-hidden">
        <table className="w-full text-sm" style={{ fontFamily: 'var(--font-mulish)' }}>
          <thead style={{ background: 'rgba(225,210,180,0.18)' }}>
            <tr>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left w-28">Date</th>
              <th className="px-3 py-2 text-left w-32">Outcome</th>
              <th className="px-3 py-2 text-left">Detail</th>
            </tr>
          </thead>
          <tbody>
            {job.items
              .filter(i => i.is_selected || i.outcome !== 'pending')
              .map(item => (
                <ProgressRow key={item.id} item={item} />
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


function ProgressRow({ item }: { item: BulkImportJobItem }) {
  return (
    <tr style={{ borderTop: '1px solid rgba(225,210,180,0.3)' }}>
      <td className="px-3 py-2 align-top">
        {item.video_id ? (
          <Link href={`/sermons/${item.video_id}`} className="underline" style={{ color: '#2C1E0F' }}>
            {item.title || item.youtube_video_id}
          </Link>
        ) : (
          <a
            href={item.youtube_url}
            target="_blank"
            rel="noreferrer"
            className="underline"
            style={{ color: '#2C1E0F' }}
          >
            {item.title || item.youtube_video_id}
          </a>
        )}
      </td>
      <td className="px-3 py-2 align-top text-xs" style={{ color: '#7A6A58' }}>
        {item.upload_date ? formatGardenDateShort(item.upload_date) : '—'}
      </td>
      <td className="px-3 py-2 align-top text-xs">
        <OutcomeBadge outcome={item.outcome} />
      </td>
      <td className="px-3 py-2 align-top text-xs" style={{ color: '#7A6A58' }}>
        {item.failure_kind && (
          <div>
            <span className="font-semibold">{item.failure_kind}</span>
            {item.failure_message && (
              <div className="truncate max-w-[28rem]">{item.failure_message}</div>
            )}
          </div>
        )}
        {item.outcome === 'skipped_duplicate' && item.existing_video_id && (
          <Link
            href={`/sermons/${item.existing_video_id}`}
            className="underline"
          >
            Open existing
          </Link>
        )}
      </td>
    </tr>
  )
}


function OutcomeBadge({ outcome }: { outcome: BulkImportItemOutcome }) {
  const map: Record<BulkImportItemOutcome, { bg: string; fg: string; label: string }> = {
    pending: { bg: 'rgba(160,144,128,0.18)', fg: '#5A4530', label: 'Pending' },
    running: { bg: 'rgba(120,150,200,0.18)', fg: '#3A5878', label: 'Running' },
    completed: { bg: 'rgba(95,140,95,0.15)', fg: '#3D6B3D', label: 'Completed' },
    failed: { bg: 'rgba(139,58,58,0.10)', fg: '#8B3A3A', label: 'Failed' },
    skipped_duplicate: { bg: 'rgba(170,150,90,0.18)', fg: '#7A6020', label: 'Skipped (dup)' },
    skipped_unselected: { bg: 'rgba(160,144,128,0.18)', fg: '#5A4530', label: 'Skipped' },
    cancelled: { bg: 'rgba(160,144,128,0.18)', fg: '#5A4530', label: 'Cancelled' },
  }
  const { bg, fg, label } = map[outcome]
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
      style={{ background: bg, color: fg }}
    >
      {label}
    </span>
  )
}


// ── Helpers ────────────────────────────────────────────────────────


function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}


function countByOutcome(items: BulkImportJobItem[]): Record<string, number> {
  const counts: Record<string, number> = {
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    skipped_duplicate: 0,
    skipped_unselected: 0,
    cancelled: 0,
  }
  for (const item of items) {
    counts[item.outcome] = (counts[item.outcome] ?? 0) + 1
  }
  return counts
}


function groupByWeek(
  items: BulkImportJobItem[],
): { key: string; label: string; items: BulkImportJobItem[] }[] {
  const groups = new Map<string, BulkImportJobItem[]>()
  for (const item of items) {
    const key = item.week_anchor_sunday ?? 'no-date'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }
  // Map to ordered array; "no-date" goes last.
  const dated: { key: string; items: BulkImportJobItem[] }[] = []
  let nodate: { key: string; items: BulkImportJobItem[] } | null = null
  for (const [key, value] of groups) {
    if (key === 'no-date') nodate = { key, items: value }
    else dated.push({ key, items: value })
  }
  dated.sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0))
  const result = dated.map(g => ({
    key: g.key,
    label: `Week of ${formatGardenDateShort(g.key)}`,
    items: g.items,
  }))
  if (nodate) {
    result.push({
      key: nodate.key,
      label: 'No upload date',
      items: nodate.items,
    })
  }
  return result
}
