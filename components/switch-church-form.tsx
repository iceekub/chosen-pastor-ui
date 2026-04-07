'use client'

import { useActionState } from 'react'
import { switchChurchAction } from '@/app/actions/admin'

export function SwitchChurchForm() {
  const [state, action, pending] = useActionState(switchChurchAction, null)

  return (
    <form action={action} className="flex gap-3">
      <input
        name="church_id"
        type="number"
        required
        placeholder="Church ID"
        className="rounded-lg border border-stone-300 px-3 py-2 text-sm w-40 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-stone-800 text-white px-4 py-2 text-sm font-medium hover:bg-stone-900 disabled:opacity-50 transition-colors"
      >
        {pending ? 'Switching…' : 'Switch'}
      </button>
      {state?.error && <p className="text-sm text-red-600 self-center">{state.error}</p>}
    </form>
  )
}
