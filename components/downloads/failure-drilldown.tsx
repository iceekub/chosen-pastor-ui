'use client'

import Link from 'next/link'
import { timeAgo } from '@/lib/dates'
import { attemptRoute, explainKind } from '@/lib/downloads'
import type { DerivedDownload } from '@/lib/downloads'
import type { AttemptWithDevice, DownloadVideoRow } from '@/lib/api/types'
import { JobActionButton } from '@/components/downloads/job-action-button'
import { KindChip } from '@/components/downloads/downloads-list'

interface FailureDrilldownProps {
  video: DownloadVideoRow
  derived: DerivedDownload
  /** Chosen super_admin — unlocks box / egress columns. */
  isAdmin: boolean
}

function attemptBox(a: AttemptWithDevice): string {
  const route = attemptRoute(a)
  if (route === 'proxy') return 'Residential proxy'
  if (route === 'central') return 'Central server'
  if (route === 'device') return a.device?.name ?? 'Fetch device'
  return '—'
}

/**
 * Expanded panel under a failed download: what kind of failure, the
 * raw error output (to spot YouTube bot-blocks), the attempt history,
 * and a retry action when a fleet job can be re-queued.
 */
export function FailureDrilldown({ video, derived, isAdmin }: FailureDrilldownProps) {
  const failure = derived.failure
  const excerpt =
    failure?.message ?? video.error_message ?? 'No error output was captured.'

  return (
    <div
      className="px-5 pb-5 pt-1 anim-fadeIn"
      style={{ background: 'rgba(200,182,155,0.07)' }}
    >
      {/* Headline: what happened, in English */}
      <div className="flex items-start gap-2 mb-3">
        {failure?.kind && <KindChip kind={failure.kind} />}
        <p
          className="text-xs leading-relaxed"
          style={{ color: '#7A6A58', fontFamily: 'var(--font-mulish)' }}
        >
          {failure ? failure.explanation : explainKind(null)}
          {failure?.httpStatus ? ` (HTTP ${failure.httpStatus})` : ''}
        </p>
      </div>

      {/* Attempt history */}
      {derived.attempts.length > 0 && (
        <div className="mb-3 overflow-x-auto">
          <table className="w-full text-xs" style={{ fontFamily: 'var(--font-mulish)' }}>
            <thead>
              <tr
                className="text-left"
                style={{ color: '#9A8878', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: 10 }}
              >
                <th className="py-1 pr-3 font-semibold">#</th>
                <th className="py-1 pr-3 font-semibold">Started</th>
                <th className="py-1 pr-3 font-semibold">Outcome</th>
                <th className="py-1 pr-3 font-semibold">Kind</th>
                <th className="py-1 pr-3 font-semibold">HTTP</th>
                {isAdmin && <th className="py-1 pr-3 font-semibold">Box</th>}
                {isAdmin && <th className="py-1 pr-3 font-semibold">Egress IP</th>}
                {isAdmin && <th className="py-1 pr-3 font-semibold">yt-dlp</th>}
              </tr>
            </thead>
            <tbody style={{ color: '#7A6A58' }}>
              {derived.attempts.map((a) => (
                <tr key={a.id} style={{ borderTop: '1px solid rgba(200,182,155,0.25)' }}>
                  <td className="py-1.5 pr-3">{a.attempt_number}</td>
                  <td className="py-1.5 pr-3" title={a.started_at} suppressHydrationWarning>
                    {timeAgo(a.started_at)}
                  </td>
                  <td className="py-1.5 pr-3">
                    <span
                      style={{
                        color:
                          a.outcome === 'succeeded'
                            ? '#5A8A6A'
                            : a.outcome === 'failed'
                              ? '#8B3A3A'
                              : '#5878A8',
                      }}
                    >
                      {a.outcome.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 font-mono" style={{ fontSize: 10 }}>
                    {a.kind ?? '—'}
                  </td>
                  <td className="py-1.5 pr-3">{a.http_status ?? '—'}</td>
                  {isAdmin && <td className="py-1.5 pr-3">{attemptBox(a)}</td>}
                  {isAdmin && (
                    <td className="py-1.5 pr-3 font-mono" style={{ fontSize: 10 }}>
                      {a.egress_ip ?? '—'}
                    </td>
                  )}
                  {isAdmin && <td className="py-1.5 pr-3">{a.yt_dlp_version ?? '—'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Raw error output */}
      <pre
        className="text-[11px] rounded-lg p-3 overflow-y-auto"
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          maxHeight: 240,
          background: 'rgba(44,30,15,0.05)',
          color: '#5A4A3A',
          border: '1px solid rgba(200,182,155,0.35)',
        }}
      >
        {excerpt}
      </pre>

      {/* Actions */}
      <div className="flex items-center gap-4 mt-3">
        {derived.retryJobId && (
          <JobActionButton jobId={derived.retryJobId} action="retry" />
        )}
        <Link
          href={`/sermons/${video.id}`}
          className="text-xs font-semibold hover:underline"
          style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}
        >
          Open sermon page →
        </Link>
        {derived.bulkImportJobId && (
          <Link
            href={`/sermons/bulk-import/${derived.bulkImportJobId}`}
            className="text-xs font-semibold hover:underline"
            style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}
          >
            View bulk import →
          </Link>
        )}
      </div>
    </div>
  )
}
