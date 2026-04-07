'use client'

import { useActionState } from 'react'
import { createChurchAction } from '@/app/actions/admin'

export function CreateChurchForm() {
  const [state, action, pending] = useActionState(createChurchAction, null)

  return (
    <form action={action} className="space-y-3 max-w-sm">
      {[
        { name: 'name', label: 'Church Name', placeholder: 'Grace Community Church', required: true },
        { name: 'city', label: 'City', placeholder: 'Nashville' },
        { name: 'state', label: 'State', placeholder: 'TN' },
      ].map(({ name, label, placeholder, required }) => (
        <div key={name}>
          <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
          <input
            name={name}
            required={required}
            placeholder={placeholder}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      ))}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && (
        <p className="text-sm text-emerald-700">Church &quot;{state.name}&quot; created.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50 transition-colors"
      >
        {pending ? 'Creating…' : 'Create Church'}
      </button>
    </form>
  )
}
