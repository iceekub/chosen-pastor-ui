'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Surface-level check — full URL parsing lives server-side in
// services.channel_url.normalize_channel_url. The form-level regex
// catches obvious typos before we burn a round-trip.
const ACCEPTABLE_CHANNEL_RE =
  /^(?:@[A-Za-z0-9._-]+|https?:\/\/(?:www\.|m\.)?youtube\.com\/(?:@|c\/|channel\/|user\/)|youtube\.com\/(?:@|c\/|channel\/|user\/))/i

type FormState = 'idle' | 'submitting' | 'error'

/**
 * Phase 1 of the bulk-import flow: paste a YouTube channel URL +
 * tune the defaults. On submit we POST to /api/bulk-imports, then
 * the user lands on /sermons/bulk-import/{id} where phase 2 (review)
 * takes over.
 */
export function BulkImportStartForm() {
  const router = useRouter()
  const [channelUrl, setChannelUrl] = useState('')
  const [requestedCount, setRequestedCount] = useState(25)
  const [pacingSeconds, setPacingSeconds] = useState(60)
  const [threshold, setThreshold] = useState(3)
  const [automatic, setAutomatic] = useState(false)
  const [force, setForce] = useState(false)

  const [state, setState] = useState<FormState>('idle')
  const [error, setError] = useState<string | null>(null)

  const trimmed = channelUrl.trim()
  const looksValid = trimmed.length > 0 && ACCEPTABLE_CHANNEL_RE.test(trimmed)
  const busy = state === 'submitting'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!looksValid || busy) return
    setState('submitting')
    setError(null)
    try {
      const res = await fetch('/api/bulk-imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_url: trimmed,
          requested_count: requestedCount,
          pacing_seconds: pacingSeconds,
          consecutive_failure_threshold: threshold,
          automatic,
          force,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body.error || `Request failed (${res.status})`)
      }
      router.push(`/sermons/bulk-import/${body.id}`)
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Failed to start import')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <FieldLabel>YouTube channel URL</FieldLabel>
        <input
          type="text"
          value={channelUrl}
          onChange={e => setChannelUrl(e.target.value)}
          disabled={busy}
          placeholder="https://www.youtube.com/@SBCFamilyOC or @SBCFamilyOC"
          className="input-warm w-full"
          autoComplete="off"
          required
        />
        {trimmed.length > 0 && !looksValid && (
          <p
            className="text-xs mt-1"
            style={{ color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}
          >
            Paste a channel URL, a /videos or /streams link, or a bare
            @handle.
          </p>
        )}
        <p
          className="text-xs mt-1"
          style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}
        >
          For a livestream archive try the channel&apos;s /streams URL.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <FieldLabel>Weeks back</FieldLabel>
          <input
            type="number"
            min={1}
            max={200}
            value={requestedCount}
            onChange={e =>
              setRequestedCount(Math.max(1, Number(e.target.value) || 1))
            }
            disabled={busy}
            className="input-warm w-full"
          />
        </div>
        <div>
          <FieldLabel>Pacing (sec)</FieldLabel>
          <input
            type="number"
            min={0}
            max={600}
            value={pacingSeconds}
            onChange={e =>
              setPacingSeconds(Math.max(0, Number(e.target.value) || 0))
            }
            disabled={busy}
            className="input-warm w-full"
          />
        </div>
        <div>
          <FieldLabel>Stop after</FieldLabel>
          <input
            type="number"
            min={1}
            max={50}
            value={threshold}
            onChange={e =>
              setThreshold(Math.max(1, Number(e.target.value) || 1))
            }
            disabled={busy}
            className="input-warm w-full"
          />
        </div>
      </div>
      <p
        className="text-xs"
        style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}
      >
        We&apos;ll scan {requestedCount * 4} recent uploads and recommend one
        per week. Stop after {threshold} downloads fail in a row.
      </p>

      <div className="space-y-2 pt-1">
        <Checkbox
          checked={automatic}
          onChange={setAutomatic}
          disabled={busy}
          label="Skip review and queue recommendations automatically"
        />
        <Checkbox
          checked={force}
          onChange={setForce}
          disabled={busy}
          label="Re-download videos we already have"
        />
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
          {error}
        </div>
      )}

      <div className="flex items-center justify-end pt-1">
        <button
          type="submit"
          disabled={!looksValid || busy}
          className="btn-gold px-6 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Discovering…' : 'Scan channel'}
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

function Checkbox({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  label: string
}) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
      />
      <span style={{ color: '#5A4530', fontFamily: 'var(--font-mulish)' }}>
        {label}
      </span>
    </label>
  )
}
