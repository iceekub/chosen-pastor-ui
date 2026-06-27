'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ButtonState = 'idle' | 'confirming' | 'working' | 'error'

const COPY = {
  retry: {
    button: 'Retry download',
    confirm: 'Re-queue for the whole fleet?',
    working: 'Re-queueing…',
  },
  cancel: {
    button: 'Cancel',
    confirm: 'Cancel this download?',
    working: 'Cancelling…',
  },
} as const

/**
 * Retry a failed/cancelled fetch job (re-opens it for every device) or
 * cancel a queued one. Inline two-step confirm, same idiom as
 * RotateWorkerIpButton; refreshes the page data on success.
 */
export function JobActionButton({
  jobId,
  action,
}: {
  jobId: string
  action: 'retry' | 'cancel'
}) {
  const router = useRouter()
  const [state, setState] = useState<ButtonState>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const copy = COPY[action]

  async function run() {
    setState('working')
    setMessage(null)
    try {
      const res = await fetch(`/api/fetch/jobs/${jobId}/${action}`, {
        method: 'POST',
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body.error || `Request failed (${res.status})`)
      }
      router.refresh()
      setState('idle')
    } catch (err) {
      setState('error')
      setMessage(err instanceof Error ? err.message : 'Request failed')
    }
  }

  if (state === 'confirming') {
    return (
      <span className="inline-flex items-center gap-2 text-xs" style={{ fontFamily: 'var(--font-mulish)' }}>
        <span style={{ color: '#7A6A58' }}>{copy.confirm}</span>
        <button
          type="button"
          onClick={run}
          className="font-semibold hover:underline"
          style={{ color: '#B8874A' }}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => setState('idle')}
          className="hover:underline"
          style={{ color: '#9A8878' }}
        >
          No
        </button>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => setState('confirming')}
        disabled={state === 'working'}
        className="text-xs font-semibold hover:underline disabled:opacity-50"
        style={{ color: action === 'retry' ? '#B8874A' : '#9A8878', fontFamily: 'var(--font-mulish)' }}
      >
        {state === 'working' ? copy.working : copy.button}
      </button>
      {message && (
        <span className="text-[11px]" style={{ color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}>
          {message}
        </span>
      )}
    </span>
  )
}
