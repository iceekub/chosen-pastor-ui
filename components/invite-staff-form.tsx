'use client'

import { useActionState } from 'react'
import { inviteStaffAction } from '@/app/actions/staff'

export function InviteStaffForm() {
  const [state, action, pending] = useActionState(inviteStaffAction, null)

  return (
    <form action={action} className="space-y-3 max-w-md">
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">Name</label>
        <input
          name="name"
          required
          placeholder="Pastor Sarah"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">Email</label>
        <input
          name="email"
          type="email"
          required
          placeholder="sarah@church.example"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50 transition-colors"
      >
        {pending ? 'Sending invite…' : 'Send invite'}
      </button>
    </form>
  )
}
