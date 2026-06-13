'use client'

import { useState } from 'react'
import Link from 'next/link'
import { timeAgo } from '@/lib/dates'
import type { DeviceFailure, FetchDevice } from '@/lib/api/types'
import { DeviceToggle } from '@/components/fleet/device-toggle'

interface FleetListProps {
  devices: FetchDevice[]
  failuresByDevice: Record<string, DeviceFailure[]>
}

/**
 * Display status. `enabled === false` always wins (the kill switch is
 * authoritative); otherwise trust the server-maintained status column.
 */
function displayStatus(d: FetchDevice): 'disabled' | 'active' | 'cooling' | 'offline' {
  if (!d.enabled) return 'disabled'
  return d.status === 'disabled' ? 'offline' : d.status
}

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  active:   { label: 'Online',       color: '#5A8A6A', bg: 'rgba(90,138,106,0.12)' },
  cooling:  { label: 'Cooling down', color: '#B8874A', bg: 'rgba(184,135,74,0.12)' },
  offline:  { label: 'Offline',      color: '#9A8878', bg: 'rgba(154,136,120,0.12)' },
  disabled: { label: 'Disabled',     color: '#8B3A3A', bg: 'rgba(139,58,58,0.08)' },
}

const GRID = '1.4fr 110px 110px 150px 80px 70px 80px 170px'

export function FleetList({ devices, failuresByDevice }: FleetListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const counts = devices.reduce(
    (acc, d) => {
      acc[displayStatus(d)] += 1
      return acc
    },
    { active: 0, cooling: 0, offline: 0, disabled: 0 },
  )

  if (devices.length === 0) {
    return (
      <div className="surface px-8 py-16 text-center anim-fadeIn" style={{ borderStyle: 'dashed' }}>
        <p
          className="text-2xl mb-3"
          style={{ fontFamily: 'var(--font-playfair)', color: '#C8B89A', fontStyle: 'italic' }}
        >
          No devices registered.
        </p>
        <p className="text-sm" style={{ color: '#9A8878', fontFamily: 'var(--font-mulish)' }}>
          Register one with <code className="font-mono">ragserv device-create</code> — see
          docs/fetcher-runbook.md in the ragserv repo.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="flex items-center gap-3 anim-fadeUp" style={{ animationDelay: '0.04s' }}>
        {(['active', 'cooling', 'offline', 'disabled'] as const).map((key) => {
          const s = STATUS_BADGE[key]
          return (
            <span
              key={key}
              className="text-xs font-semibold rounded-full px-3 py-1.5"
              style={{ background: s.bg, color: s.color, fontFamily: 'var(--font-mulish)' }}
            >
              {counts[key]} {s.label.toLowerCase()}
            </span>
          )
        })}
      </div>

      <div className="surface overflow-hidden anim-fadeUp" style={{ animationDelay: '0.08s', padding: 0 }}>
        <div
          className="grid text-xs font-semibold px-5 py-3"
          style={{
            gridTemplateColumns: GRID,
            background: 'rgba(200,182,155,0.18)',
            borderBottom: '1px solid rgba(200,182,155,0.45)',
            color: '#9A8878',
            fontFamily: 'var(--font-mulish)',
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
          }}
        >
          <span>Device</span>
          <span>Status</span>
          <span>Last seen</span>
          <span>Versions</span>
          <span>Disk</span>
          <span>Blocks</span>
          <span>Errors 7d</span>
          <span>Actions</span>
        </div>

        {devices.map((device, i) => {
          const status = displayStatus(device)
          const s = STATUS_BADGE[status]
          const failures = failuresByDevice[device.id] ?? []
          const open = expanded.has(device.id)
          const lowDisk = device.disk_free_gb !== null && device.disk_free_gb < 5
          return (
            <div
              key={device.id}
              style={{
                borderBottom: i < devices.length - 1 ? '1px solid rgba(200,182,155,0.3)' : 'none',
              }}
            >
              <div
                className="grid items-center px-5 py-3.5"
                style={{ gridTemplateColumns: GRID }}
              >
                <button
                  type="button"
                  onClick={() => toggle(device.id)}
                  className="text-left min-w-0 pr-3"
                  aria-expanded={open}
                >
                  <span
                    className="text-sm font-semibold truncate block"
                    style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}
                  >
                    <span aria-hidden="true" style={{ color: '#C8B89A', marginRight: 6 }}>
                      {open ? '▾' : '▸'}
                    </span>
                    {device.name}
                  </span>
                  <span
                    className="block text-[10px] font-mono mt-0.5"
                    style={{ color: '#C8B89A' }}
                  >
                    {device.token_prefix}…
                  </span>
                </button>
                <span>
                  <span
                    className="text-xs font-semibold rounded-full px-2.5 py-1"
                    style={{ background: s.bg, color: s.color, fontFamily: 'var(--font-mulish)' }}
                  >
                    {s.label}
                  </span>
                </span>
                <span
                  className="text-xs"
                  style={{ color: '#7A6A58', fontFamily: 'var(--font-mulish)' }}
                  title={device.last_seen_at ?? undefined}
                  suppressHydrationWarning
                >
                  {device.last_seen_at ? (
                    timeAgo(device.last_seen_at)
                  ) : (
                    <span style={{ fontStyle: 'italic', color: '#C8B89A' }}>Never</span>
                  )}
                </span>
                <span
                  className="text-[11px] leading-tight"
                  style={{ color: '#7A6A58', fontFamily: 'var(--font-mulish)' }}
                >
                  <span className="block truncate">{device.agent_version ?? '—'}</span>
                  <span className="block truncate" style={{ color: '#9A8878' }}>
                    yt-dlp {device.ytdlp_version ?? '—'}
                  </span>
                </span>
                <span
                  className="text-xs"
                  style={{
                    color: lowDisk ? '#B8874A' : '#7A6A58',
                    fontFamily: 'var(--font-mulish)',
                    fontWeight: lowDisk ? 600 : 400,
                  }}
                >
                  {device.disk_free_gb !== null ? `${device.disk_free_gb.toFixed(1)} GB` : '—'}
                </span>
                <span
                  className="text-xs"
                  style={{
                    color: device.consecutive_block_failures > 0 ? '#8B3A3A' : '#7A6A58',
                    fontFamily: 'var(--font-mulish)',
                    fontWeight: device.consecutive_block_failures > 0 ? 600 : 400,
                  }}
                >
                  {device.consecutive_block_failures}
                </span>
                <span
                  className="text-xs"
                  style={{
                    color: failures.length > 0 ? '#8B3A3A' : '#7A6A58',
                    fontFamily: 'var(--font-mulish)',
                    fontWeight: failures.length > 0 ? 600 : 400,
                  }}
                >
                  {failures.length}
                </span>
                <span>
                  <DeviceToggle device={device} />
                </span>
              </div>

              {open && (
                <div
                  className="px-5 pb-5 pt-1 anim-fadeIn"
                  style={{ background: 'rgba(200,182,155,0.07)' }}
                >
                  <dl
                    className="grid grid-cols-4 gap-x-6 gap-y-2 text-xs mb-4"
                    style={{ color: '#7A6A58', fontFamily: 'var(--font-mulish)' }}
                  >
                    <Detail label="Last IP" value={device.last_ip ?? '—'} mono />
                    <Detail
                      label="Cooldown until"
                      value={device.cooldown_until ? new Date(device.cooldown_until).toLocaleString() : '—'}
                    />
                    <Detail
                      label="Last job finished"
                      value={device.last_job_finished_at ? timeAgo(device.last_job_finished_at) : '—'}
                    />
                    <Detail label="Notes" value={device.notes ?? '—'} />
                  </dl>

                  <p
                    className="text-[10px] font-semibold mb-2"
                    style={{
                      color: '#9A8878',
                      fontFamily: 'var(--font-mulish)',
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Failures (7 days)
                  </p>
                  {failures.length === 0 ? (
                    <p className="text-xs" style={{ color: '#9A8878', fontFamily: 'var(--font-mulish)' }}>
                      No failures in the last 7 days.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {failures.map((f) => (
                        <div
                          key={f.id}
                          className="rounded-lg p-3"
                          style={{ border: '1px solid rgba(200,182,155,0.35)', background: 'rgba(255,255,255,0.4)' }}
                        >
                          <div
                            className="flex items-center gap-2 text-xs mb-1.5"
                            style={{ color: '#7A6A58', fontFamily: 'var(--font-mulish)' }}
                          >
                            <span
                              className="text-[10px] font-semibold rounded px-1.5 py-0.5 font-mono"
                              style={{ background: 'rgba(139,58,58,0.08)', color: '#8B3A3A' }}
                            >
                              {f.kind ?? 'UNKNOWN'}
                            </span>
                            {f.http_status && <span>HTTP {f.http_status}</span>}
                            <span title={f.started_at} suppressHydrationWarning>
                              {timeAgo(f.started_at)}
                            </span>
                            {f.video && (
                              <Link
                                href={`/sermons/${f.video.id}`}
                                className="hover:underline truncate"
                                style={{ color: '#B8874A' }}
                              >
                                {f.video.title}
                              </Link>
                            )}
                          </div>
                          {f.error_message && (
                            <pre
                              className="text-[10px] rounded p-2 overflow-y-auto"
                              style={{
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                maxHeight: 120,
                                background: 'rgba(44,30,15,0.05)',
                                color: '#5A4A3A',
                              }}
                            >
                              {f.error_message}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt
        className="text-[10px] font-semibold mb-0.5"
        style={{ color: '#9A8878', letterSpacing: '0.07em', textTransform: 'uppercase' }}
      >
        {label}
      </dt>
      <dd className={mono ? 'font-mono' : ''}>{value}</dd>
    </div>
  )
}
