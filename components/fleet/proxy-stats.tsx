'use client'

import { useState } from 'react'
import Link from 'next/link'
import { timeAgo } from '@/lib/dates'
import type { ProxyAttempt } from '@/lib/api/types'

/**
 * The provider's roughly-standard residential per-GB price; the spend
 * figure is an ESTIMATE for ops awareness, not billing truth (the
 * authoritative knob is ragserv's RESIDENTIAL_PROXY_COST_PER_GB and
 * the provider's invoice). Bytes counted are successful transfers —
 * failed attempts' partial bytes aren't reliably known.
 */
const ASSUMED_COST_PER_GB_USD = 8

interface ProxyStatsProps {
  attempts: ProxyAttempt[]
  windowDays: number
}

export function ProxyStats({ attempts, windowDays }: ProxyStatsProps) {
  const [open, setOpen] = useState(false)

  const succeeded = attempts.filter((a) => a.outcome === 'succeeded')
  const failed = attempts.filter((a) => a.outcome === 'failed')
  const bytes = succeeded.reduce((sum, a) => sum + (a.downloaded_bytes ?? 0), 0)
  const gb = bytes / 2 ** 30
  const estCost = gb * ASSUMED_COST_PER_GB_USD
  const lastUsed = attempts[0]?.started_at ?? null

  return (
    <div className="surface anim-fadeUp" style={{ animationDelay: '0.06s', padding: 0 }}>
      <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p
            className="text-sm font-semibold"
            style={{ color: '#2C1E0F', fontFamily: 'var(--font-mulish)' }}
          >
            Residential proxy
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#9A8878', fontFamily: 'var(--font-mulish)' }}>
            {attempts.length === 0
              ? 'No proxy downloads in this window — the route is idle or not configured.'
              : `Last used ${timeAgo(lastUsed!)}`}
          </p>
        </div>
        <div
          className="flex items-center gap-5 text-xs"
          style={{ fontFamily: 'var(--font-mulish)' }}
        >
          <Stat label={`Downloads ${windowDays}d`} value={String(succeeded.length)} />
          <Stat
            label="Failed"
            value={String(failed.length)}
            tone={failed.length > 0 ? '#8B3A3A' : undefined}
          />
          <Stat label="Data" value={`${gb.toFixed(2)} GB`} />
          <Stat
            label={`Est. cost @ $${ASSUMED_COST_PER_GB_USD}/GB`}
            value={`$${estCost.toFixed(2)}`}
            tone="#B8874A"
          />
          {attempts.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="text-xs font-semibold hover:underline"
              style={{ color: '#B8874A' }}
              aria-expanded={open}
            >
              {open ? 'Hide activity ▾' : 'Activity ▸'}
            </button>
          )}
        </div>
      </div>

      {open && attempts.length > 0 && (
        <div
          className="px-5 pb-4 anim-fadeIn"
          style={{ borderTop: '1px solid rgba(200,182,155,0.3)' }}
        >
          <table className="w-full text-xs mt-3" style={{ fontFamily: 'var(--font-mulish)' }}>
            <thead>
              <tr
                className="text-left"
                style={{ color: '#9A8878', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: 10 }}
              >
                <th className="py-1 pr-3 font-semibold">When</th>
                <th className="py-1 pr-3 font-semibold">Outcome</th>
                <th className="py-1 pr-3 font-semibold">Size</th>
                <th className="py-1 pr-3 font-semibold">Service</th>
              </tr>
            </thead>
            <tbody style={{ color: '#7A6A58' }}>
              {attempts.slice(0, 25).map((a) => (
                <tr key={a.id} style={{ borderTop: '1px solid rgba(200,182,155,0.25)' }}>
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
                      {a.kind ? ` (${a.kind})` : ''}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3">
                    {a.downloaded_bytes !== null
                      ? `${(a.downloaded_bytes / 2 ** 30).toFixed(2)} GB`
                      : '—'}
                  </td>
                  <td className="py-1.5 pr-3">
                    {a.video ? (
                      <Link
                        href={`/sermons/${a.video.id}`}
                        className="hover:underline"
                        style={{ color: '#B8874A' }}
                      >
                        {a.video.title}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <span className="text-right">
      <span
        className="block text-[10px] font-semibold"
        style={{ color: '#9A8878', letterSpacing: '0.06em', textTransform: 'uppercase' }}
      >
        {label}
      </span>
      <span className="block text-sm font-semibold mt-0.5" style={{ color: tone ?? '#2C1E0F' }}>
        {value}
      </span>
    </span>
  )
}
