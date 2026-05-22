'use client'

import { useState } from 'react'

type ButtonState = 'idle' | 'confirming' | 'rotating' | 'ok' | 'error'

export function RotateWorkerIpButton() {
  const [state, setState] = useState<ButtonState>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function doRotate() {
    setState('rotating')
    setMessage(null)
    try {
      const res = await fetch('/api/admin/rotate-worker-ip', {
        method: 'POST',
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body.error || `Request failed (${res.status})`)
      }
      setState('ok')
      setMessage(
        `Deployment ${body.deployment_id} started — new IP in ~60–90s.`,
      )
    } catch (err) {
      setState('error')
      setMessage(err instanceof Error ? err.message : 'Rotation failed')
    }
  }

  if (state === 'confirming') {
    return (
      <div className="surface p-5 space-y-3" style={{ borderColor: 'rgba(184,135,74,0.35)' }}>
        <p
          className="text-sm font-semibold"
          style={{ color: '#2C1E0F', fontFamily: 'var(--font-mulish)' }}
        >
          Restart the worker?
        </p>
        <p className="text-xs" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
          This forces a new Fargate deployment of the Celery worker so the next
          yt-dlp download uses a fresh egress IP. Any in-flight downloads will
          be killed and re-attempted from scratch — usually that&apos;s fine,
          but if a pastor is mid-upload they&apos;ll see one extra retry in
          the diagnostics. New task is ready in ~60–90 seconds.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={doRotate}
            className="btn-gold px-5 py-2 text-sm font-semibold"
          >
            Yes, rotate now
          </button>
          <button
            type="button"
            onClick={() => setState('idle')}
            className="text-sm"
            style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setState('confirming')}
        disabled={state === 'rotating'}
        className="btn-gold px-5 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state === 'rotating' ? 'Rotating…' : 'Rotate worker IP'}
      </button>
      {message && (
        <p
          className="text-xs"
          style={{
            color: state === 'ok' ? '#5A8A6A' : '#8B3A3A',
            fontFamily: 'var(--font-mulish)',
          }}
        >
          {message}
        </p>
      )}
    </div>
  )
}
