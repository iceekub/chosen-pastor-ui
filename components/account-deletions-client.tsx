'use client'

import { useState } from 'react'
import type { DeletionRequest, DeletionRequestStatus } from '@/lib/api/types'

const STATUS: Record<DeletionRequestStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pending',  color: '#B8874A', bg: 'rgba(184,135,74,0.12)' },
  approved:  { label: 'Approved', color: '#5878A8', bg: 'rgba(88,120,168,0.10)' },
  completed: { label: 'Deleted',  color: '#5A8A6A', bg: 'rgba(90,138,106,0.12)' },
  rejected:  { label: 'Rejected', color: '#9A8878', bg: 'rgba(154,136,120,0.12)' },
  failed:    { label: 'Failed',   color: '#8B3A3A', bg: 'rgba(139,58,58,0.08)' },
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function StatusBadge({ status }: { status: DeletionRequestStatus }) {
  const s = STATUS[status] ?? STATUS.pending
  return (
    <span
      className="text-xs font-semibold rounded-full px-2.5 py-1"
      style={{ background: s.bg, color: s.color, fontFamily: 'var(--font-mulish)' }}
    >
      {s.label}
    </span>
  )
}

function MatchedMember({ req }: { req: DeletionRequest }) {
  if (req.matched_profile) {
    return (
      <span style={{ color: '#2C1E0F', fontFamily: 'var(--font-mulish)' }}>
        {req.matched_profile.name}
        <span style={{ color: '#9A8878' }}> &middot; {req.matched_profile.role.replace('_', ' ')}</span>
      </span>
    )
  }
  return (
    <span style={{ color: '#9A8878', fontStyle: 'italic', fontFamily: 'var(--font-mulish)' }}>
      No matching account
    </span>
  )
}

export function AccountDeletionsClient({
  initialRequests,
}: {
  initialRequests: DeletionRequest[]
}) {
  const [requests, setRequests] = useState<DeletionRequest[]>(initialRequests)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function act(req: DeletionRequest, action: 'approve' | 'reject') {
    const confirmMsg =
      action === 'approve'
        ? `Permanently delete the account and all data for ${req.email}? This cannot be undone.`
        : `Reject the deletion request for ${req.email}?`
    if (!window.confirm(confirmMsg)) return

    setBusyId(req.id)
    setError(null)
    try {
      const res = await fetch(`/api/deletion-requests/${req.id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Failed to process the request.')
        return
      }
      setRequests((rs) => rs.map((r) => (r.id === req.id ? { ...r, ...data } : r)))
    } catch {
      setError('Network error — please try again.')
    } finally {
      setBusyId(null)
    }
  }

  const pending = requests.filter((r) => r.status === 'pending')
  const resolved = requests.filter((r) => r.status !== 'pending')

  if (requests.length === 0) {
    return (
      <div className="surface px-8 py-20 text-center anim-fadeIn" style={{ borderStyle: 'dashed' }}>
        <p
          className="text-2xl mb-3"
          style={{ fontFamily: 'var(--font-playfair)', color: '#C8B89A', fontStyle: 'italic' }}
        >
          No deletion requests.
        </p>
        <p className="text-sm" style={{ color: '#9A8878', fontFamily: 'var(--font-mulish)' }}>
          When a member requests account deletion, it will appear here for your review.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {pending.length > 0 && (
        <section className="anim-fadeUp">
          <h2
            className="text-xs font-semibold mb-3"
            style={{
              color: '#9A8878',
              fontFamily: 'var(--font-mulish)',
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
            }}
          >
            Awaiting review ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((req) => (
              <div
                key={req.id}
                className="surface p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: '#2C1E0F', fontFamily: 'var(--font-mulish)' }}
                    >
                      {req.email}
                    </span>
                    <span
                      className="text-xs rounded-full px-2 py-0.5"
                      style={{ background: 'rgba(200,182,155,0.2)', color: '#7A6A58', fontFamily: 'var(--font-mulish)' }}
                    >
                      {req.source === 'in_app' ? 'In-app' : 'Web form'}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: '#7A6A58', fontFamily: 'var(--font-mulish)' }}>
                    <MatchedMember req={req} /> &middot; requested {formatWhen(req.created_at)}
                  </p>
                  {req.reason && (
                    <p
                      className="text-xs mt-2 italic"
                      style={{ color: '#7A6A58', fontFamily: 'var(--font-mulish)' }}
                    >
                      &ldquo;{req.reason}&rdquo;
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={busyId === req.id}
                    onClick={() => act(req, 'reject')}
                    className="text-sm font-semibold rounded-xl px-4 py-2 transition-colors disabled:opacity-50"
                    style={{
                      color: '#7A6A58',
                      fontFamily: 'var(--font-mulish)',
                      border: '1px solid rgba(154,136,120,0.4)',
                      background: 'transparent',
                    }}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={busyId === req.id}
                    onClick={() => act(req, 'approve')}
                    className="text-sm font-semibold rounded-xl px-4 py-2 transition-colors disabled:opacity-50"
                    style={{ color: '#FDFAF5', fontFamily: 'var(--font-mulish)', background: '#8B3A3A' }}
                  >
                    {busyId === req.id ? 'Working…' : 'Approve & delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {resolved.length > 0 && (
        <section className="anim-fadeUp">
          <h2
            className="text-xs font-semibold mb-3"
            style={{
              color: '#9A8878',
              fontFamily: 'var(--font-mulish)',
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
            }}
          >
            History
          </h2>
          <div className="surface overflow-hidden" style={{ padding: 0 }}>
            {resolved.map((req, i) => (
              <div
                key={req.id}
                className="flex items-center justify-between px-5 py-3.5"
                style={{
                  borderBottom: i < resolved.length - 1 ? '1px solid rgba(200,182,155,0.3)' : 'none',
                }}
              >
                <div className="min-w-0">
                  <span
                    className="text-sm font-semibold truncate"
                    style={{ color: '#2C1E0F', fontFamily: 'var(--font-mulish)' }}
                  >
                    {req.email}
                  </span>
                  <p className="text-xs mt-0.5" style={{ color: '#9A8878', fontFamily: 'var(--font-mulish)' }}>
                    {req.reviewed_at ? formatWhen(req.reviewed_at) : formatWhen(req.created_at)}
                    {req.notes ? ` — ${req.notes}` : ''}
                  </p>
                </div>
                <StatusBadge status={req.status} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
