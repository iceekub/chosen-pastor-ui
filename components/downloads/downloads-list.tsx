'use client'

import { useState } from 'react'
import Link from 'next/link'
import { timeAgo } from '@/lib/dates'
import { deriveDownloadRow } from '@/lib/downloads'
import type { DerivedDownload } from '@/lib/downloads'
import type { DownloadVideoRow } from '@/lib/api/types'
import { FailureDrilldown } from '@/components/downloads/failure-drilldown'
import { JobActionButton } from '@/components/downloads/job-action-button'

interface DownloadsListProps {
  rows: DownloadVideoRow[]
  /** Chosen super_admin — unlocks box/device columns. */
  isAdmin: boolean
  /** Super_admin browsing without an emulated church — show church names. */
  showChurch: boolean
}

interface Derived {
  video: DownloadVideoRow
  d: DerivedDownload
}

const STATE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  queued:      { label: 'Queued',      color: '#9A8878', bg: 'rgba(154,136,120,0.1)' },
  in_progress: { label: 'Downloading', color: '#5878A8', bg: 'rgba(88,120,168,0.1)' },
  completed:   { label: 'Completed',   color: '#5A8A6A', bg: 'rgba(90,138,106,0.12)' },
  failed:      { label: 'Failed',      color: '#8B3A3A', bg: 'rgba(139,58,58,0.08)' },
  cancelled:   { label: 'Cancelled',   color: '#9A8878', bg: 'rgba(154,136,120,0.1)' },
}

function boxLabel(d: DerivedDownload): string {
  if (d.source === 'central') return 'Central server'
  if (d.source === 'device') return d.deviceName ?? 'Fetch device'
  return '—'
}

export function DownloadsList({ rows, isAdmin, showChurch }: DownloadsListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const derived: Derived[] = rows.map((video) => ({
    video,
    d: deriveDownloadRow(video),
  }))
  const activeRows = derived.filter(
    ({ d }) => d.state === 'queued' || d.state === 'in_progress',
  )
  const completedRows = derived.filter(({ d }) => d.state === 'completed')
  const failedRows = derived.filter(
    ({ d }) => d.state === 'failed' || d.state === 'cancelled',
  )

  return (
    <div className="space-y-8">
      <Section
        title="Active"
        delay="0.06s"
        empty="Nothing downloading right now."
      >
        {activeRows.map(({ video, d }, i) => (
          <Row key={video.id} index={i}>
            <TitleCell video={video} showChurch={showChurch} />
            <span>
              <StateBadge d={d} />
              {d.queuedNote && (
                <span
                  className="block text-[11px] mt-1"
                  style={{ color: '#9A8878', fontFamily: 'var(--font-mulish)' }}
                >
                  {d.queuedNote}
                </span>
              )}
            </span>
            <span className="pr-3">
              {d.state === 'in_progress' && (
                <ProgressCell d={d} />
              )}
              {d.state === 'queued' && d.cancelJobId && (
                <JobActionButton jobId={d.cancelJobId} action="cancel" />
              )}
            </span>
            {isAdmin && <BoxCell d={d} />}
          </Row>
        ))}
      </Section>

      <Section
        title="Recently completed"
        delay="0.12s"
        empty="No downloads finished in this window."
      >
        {completedRows.map(({ video, d }, i) => (
          <Row key={video.id} index={i}>
            <TitleCell video={video} showChurch={showChurch} />
            <span>
              <StateBadge d={d} />
              {d.laterFailure && (
                <span
                  className="block text-[11px] mt-1"
                  style={{ color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}
                >
                  downloaded, but processing failed later — see the sermon page
                </span>
              )}
            </span>
            <span
              className="text-xs"
              style={{ color: '#7A6A58', fontFamily: 'var(--font-mulish)' }}
              title={d.completedAt ?? undefined}
              suppressHydrationWarning
            >
              {d.completedAt ? timeAgo(d.completedAt) : '—'}
            </span>
            {isAdmin && <BoxCell d={d} />}
          </Row>
        ))}
      </Section>

      <Section
        title="Failed"
        delay="0.18s"
        empty="No failures in this window. 🎉"
      >
        {failedRows.map(({ video, d }, i) => {
          const open = expanded.has(video.id)
          return (
            <div
              key={video.id}
              style={{
                borderBottom:
                  i < failedRows.length - 1
                    ? '1px solid rgba(200,182,155,0.3)'
                    : 'none',
              }}
            >
              <button
                type="button"
                onClick={() => toggle(video.id)}
                className="w-full grid items-center px-5 py-3.5 text-left hover:bg-[rgba(200,182,155,0.08)] transition-colors"
                style={{ gridTemplateColumns: gridColumns(isAdmin) }}
                aria-expanded={open}
              >
                <TitleCell video={video} showChurch={showChurch} asSpan />
                <span>
                  <StateBadge d={d} />
                </span>
                <span
                  className="text-xs flex items-center gap-2"
                  style={{ color: '#7A6A58', fontFamily: 'var(--font-mulish)' }}
                >
                  {d.failure?.kind && <KindChip kind={d.failure.kind} />}
                  <span>
                    {d.attempts.length} attempt{d.attempts.length === 1 ? '' : 's'}
                  </span>
                  <span aria-hidden="true" style={{ color: '#C8B89A' }}>
                    {open ? '▾' : '▸'}
                  </span>
                </span>
                {isAdmin && <BoxCell d={d} />}
              </button>
              {open && (
                <FailureDrilldown video={video} derived={d} isAdmin={isAdmin} />
              )}
            </div>
          )
        })}
      </Section>
    </div>
  )

  // ── local pieces (closures over isAdmin) ──────────────────────────

  function Section({
    title,
    delay,
    empty,
    children,
  }: {
    title: string
    delay: string
    empty: string
    children: React.ReactNode[]
  }) {
    return (
      <section className="anim-fadeUp" style={{ animationDelay: delay }}>
        <h2
          className="text-xl mb-3"
          style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F', fontStyle: 'italic' }}
        >
          {title}
        </h2>
        {children.length === 0 ? (
          <div className="surface px-6 py-8 text-center" style={{ borderStyle: 'dashed' }}>
            <p className="text-sm" style={{ color: '#9A8878', fontFamily: 'var(--font-mulish)' }}>
              {empty}
            </p>
          </div>
        ) : (
          <div className="surface overflow-hidden" style={{ padding: 0 }}>
            <div
              className="grid text-xs font-semibold px-5 py-3"
              style={{
                gridTemplateColumns: gridColumns(isAdmin),
                background: 'rgba(200,182,155,0.18)',
                borderBottom: '1px solid rgba(200,182,155,0.45)',
                color: '#9A8878',
                fontFamily: 'var(--font-mulish)',
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
              }}
            >
              <span>Service</span>
              <span>Status</span>
              <span>{title === 'Recently completed' ? 'Finished' : 'Detail'}</span>
              {isAdmin && <span>Box</span>}
            </div>
            {children}
          </div>
        )}
      </section>
    )
  }

  function Row({ children, index }: { children: React.ReactNode; index: number }) {
    return (
      <div
        className="grid items-center px-5 py-3.5"
        style={{
          gridTemplateColumns: gridColumns(isAdmin),
          borderBottom: '1px solid rgba(200,182,155,0.3)',
          animationDelay: `${0.1 + index * 0.03}s`,
        }}
      >
        {children}
      </div>
    )
  }
}

function gridColumns(isAdmin: boolean): string {
  return isAdmin ? '1fr 170px 220px 140px' : '1fr 170px 220px'
}

function TitleCell({
  video,
  showChurch,
  asSpan = false,
}: {
  video: DownloadVideoRow
  showChurch: boolean
  asSpan?: boolean
}) {
  const title = (
    <>
      <span
        className="text-sm font-semibold truncate block"
        style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}
      >
        {video.title || (
          <span style={{ color: '#C8B89A', fontStyle: 'italic' }}>Untitled</span>
        )}
      </span>
      {showChurch && video.churches?.name && (
        <span
          className="block text-[11px] mt-0.5"
          style={{ color: '#9A8878', fontFamily: 'var(--font-mulish)' }}
        >
          {video.churches.name}
        </span>
      )}
    </>
  )
  if (asSpan) return <span className="pr-4 min-w-0">{title}</span>
  return (
    <Link href={`/sermons/${video.id}`} className="pr-4 min-w-0 hover:underline">
      {title}
    </Link>
  )
}

function StateBadge({ d }: { d: DerivedDownload }) {
  const s = STATE_BADGE[d.state] ?? STATE_BADGE.queued
  return (
    <span
      className="text-xs font-semibold rounded-full px-2.5 py-1"
      style={{ background: s.bg, color: s.color, fontFamily: 'var(--font-mulish)' }}
    >
      {s.label}
    </span>
  )
}

function ProgressCell({ d }: { d: DerivedDownload }) {
  return (
    <span className="block">
      <span
        className="block text-xs"
        style={{ color: '#5878A8', fontFamily: 'var(--font-mulish)' }}
      >
        {d.stepLabel}
        {d.percent !== null && ` — ${Math.round(d.percent)}%`}
        {d.progressStale && (
          <span style={{ color: '#9A8878' }}> (no progress for a while)</span>
        )}
      </span>
      {d.percent !== null && (
        <span
          className="block mt-1.5 rounded-full overflow-hidden"
          style={{ height: 4, background: 'rgba(88,120,168,0.15)', maxWidth: 180 }}
        >
          <span
            className="block h-full rounded-full"
            style={{
              width: `${Math.min(100, Math.max(0, d.percent))}%`,
              background: '#5878A8',
            }}
          />
        </span>
      )}
    </span>
  )
}

function BoxCell({ d }: { d: DerivedDownload }) {
  return (
    <span
      className="text-xs truncate"
      style={{ color: '#7A6A58', fontFamily: 'var(--font-mulish)' }}
    >
      {boxLabel(d)}
    </span>
  )
}

export function KindChip({ kind }: { kind: string }) {
  return (
    <span
      className="text-[10px] font-semibold rounded px-1.5 py-0.5 font-mono"
      style={{ background: 'rgba(139,58,58,0.08)', color: '#8B3A3A' }}
    >
      {kind}
    </span>
  )
}
