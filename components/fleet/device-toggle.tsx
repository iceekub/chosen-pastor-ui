'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FetchDevice } from '@/lib/api/types'

type ButtonState = 'idle' | 'confirming' | 'working' | 'error'

/**
 * Enable/disable a fetch device — the server-side kill switch. Works
 * whether or not the box is reachable: ragserv simply starts rejecting
 * (or accepting) its calls, and an in-flight job is reassigned by the
 * lease reaper within a few minutes.
 */
export function DeviceToggle({ device }: { device: FetchDevice }) {
  const router = useRouter()
  const [state, setState] = useState<ButtonState>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const action = device.enabled ? 'disable' : 'enable'

  async function run() {
    setState('working')
    setMessage(null)
    try {
      const res = await fetch(`/api/fetch/devices/${device.id}/${action}`, {
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
      <span
        className="inline-flex flex-col gap-1 text-[11px]"
        style={{ fontFamily: 'var(--font-mulish)' }}
      >
        <span style={{ color: '#7A6A58' }}>
          {device.enabled
            ? 'Take this device out of rotation? Any in-flight job is reassigned within a few minutes.'
            : `Put ${device.name} back into rotation?`}
        </span>
        <span className="inline-flex items-center gap-3">
          <button
            type="button"
            onClick={run}
            className="font-semibold hover:underline"
            style={{ color: device.enabled ? '#8B3A3A' : '#5A8A6A' }}
          >
            Yes, {action}
          </button>
          <button
            type="button"
            onClick={() => setState('idle')}
            className="hover:underline"
            style={{ color: '#9A8878' }}
          >
            Cancel
          </button>
        </span>
      </span>
    )
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setState('confirming')}
        disabled={state === 'working'}
        className="text-xs font-semibold rounded-full px-3 py-1.5 disabled:opacity-50 text-left w-fit"
        style={{
          fontFamily: 'var(--font-mulish)',
          color: device.enabled ? '#8B3A3A' : '#5A8A6A',
          background: device.enabled ? 'rgba(139,58,58,0.08)' : 'rgba(90,138,106,0.12)',
        }}
      >
        {state === 'working'
          ? 'Working…'
          : device.enabled
            ? 'Disable'
            : 'Enable'}
      </button>
      {message && (
        <span className="text-[10px]" style={{ color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}>
          {message}
        </span>
      )}
    </span>
  )
}
