'use client'

/**
 * Landing page invitees hit after clicking a magic-link invite email.
 *
 * Supabase Auth processes the link parameters client-side, signs the
 * user in, and we then prompt for a password. The signup-side trigger
 * (handle_new_user) has already created their profile with the right
 * role + church_id, since those came in via the invite metadata.
 */

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  { auth: { detectSessionInUrl: true } },
)

export default function AcceptInvitePage() {
  const router = useRouter()
  const search = useSearchParams()
  const [email, setEmail] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    // Supabase parses the access_token / refresh_token in the URL hash
    // automatically when detectSessionInUrl=true.
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        const errParam = search.get('error_description')
        setError(errParam || 'This invite link is invalid or expired.')
        return
      }
      setEmail(session.user.email ?? null)
    })
  }, [search])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setPending(true)
    const { error: updateErr } = await supabaseClient.auth.updateUser({ password })
    if (updateErr) {
      setError(updateErr.message)
      setPending(false)
      return
    }

    // Forward the just-issued tokens to the server so the session
    // cookie is set and the rest of the app can use them.
    const { data: { session } } = await supabaseClient.auth.getSession()
    if (!session) {
      setError('Lost session — please try signing in.')
      setPending(false)
      return
    }
    const res = await fetch('/api/auth/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
    })
    if (!res.ok) {
      setError('Could not start a session.')
      setPending(false)
      return
    }
    router.replace('/dashboard')
  }

  if (error && !email) {
    return (
      <div className="max-w-md mx-auto py-16 px-6">
        <h1 className="text-xl font-semibold text-stone-900 mb-2">Invalid invite</h1>
        <p className="text-sm text-stone-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto py-16 px-6">
      <h1 className="text-2xl font-semibold text-stone-900 mb-1">Set your password</h1>
      <p className="text-sm text-stone-500 mb-6">
        {email ? `Welcome ${email}.` : 'Loading…'}
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending || !email}
          className="w-full rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Setting password…' : 'Set password & continue'}
        </button>
      </form>
    </div>
  )
}
