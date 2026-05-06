'use client'

import { useActionState } from 'react'
import { createChurchAction } from '@/app/actions/admin'

const fieldLabel = (text: string, optional?: boolean) => (
  <label
    className="block text-xs font-semibold mb-1.5"
    style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
  >
    {text}
    {optional && (
      <span className="ml-1.5 normal-case font-normal" style={{ color: '#C5B49A' }}>
        optional
      </span>
    )}
  </label>
)

export function CreateChurchForm() {
  const [state, action, pending] = useActionState(createChurchAction, null)

  return (
    <form action={action} className="space-y-4 max-w-sm">
      {/* Name */}
      <div>
        {fieldLabel('Church Name')}
        <input
          name="name"
          required
          placeholder="Grace Community Church"
          className="input-warm w-full"
        />
      </div>

      {/* City / State */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          {fieldLabel('City', true)}
          <input name="city" placeholder="Nashville" className="input-warm w-full" />
        </div>
        <div>
          {fieldLabel('State', true)}
          <input name="state" placeholder="TN" maxLength={2} className="input-warm w-full uppercase" />
        </div>
      </div>

      {/* Timezone */}
      <div>
        {fieldLabel('Timezone')}
        <select name="timezone" defaultValue="America/Chicago" className="input-warm w-full">
          <option value="America/New_York">Eastern Time</option>
          <option value="America/Chicago">Central Time</option>
          <option value="America/Denver">Mountain Time</option>
          <option value="America/Phoenix">Mountain Time — Phoenix</option>
          <option value="America/Los_Angeles">Pacific Time</option>
          <option value="America/Anchorage">Alaska Time</option>
          <option value="Pacific/Honolulu">Hawaii Time</option>
        </select>
      </div>

      {/* Divider */}
      <div className="pt-1 pb-1">
        <div style={{ height: 1, background: 'rgba(200,182,155,0.25)' }} />
      </div>

      {/* First admin invite */}
      <div>
        {fieldLabel('Invite First Admin', true)}
        <input
          name="admin_email"
          type="email"
          placeholder="pastor@gracechurch.com"
          className="input-warm w-full"
        />
        <p className="text-xs mt-1" style={{ color: '#C5B49A', fontFamily: 'var(--font-mulish)' }}>
          Sends a setup link to this address after the church is created.
        </p>
      </div>

      {state?.error && (
        <p
          className="text-sm rounded-lg px-3 py-2"
          style={{ color: '#8B3A3A', background: 'rgba(139,58,58,0.08)', border: '1px solid rgba(139,58,58,0.2)', fontFamily: 'var(--font-mulish)' }}
        >
          {state.error}
        </p>
      )}
      {state?.success && (
        <p
          className="text-sm rounded-lg px-3 py-2"
          style={{ color: '#3A7A5A', background: 'rgba(90,138,106,0.1)', border: '1px solid rgba(90,138,106,0.25)', fontFamily: 'var(--font-mulish)' }}
        >
          Church &quot;{state.name}&quot; created.
        </p>
      )}

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={pending}
          className="btn-gold px-7 py-2.5 text-sm"
        >
          {pending ? 'Creating…' : 'Create Church'}
        </button>
      </div>
    </form>
  )
}
