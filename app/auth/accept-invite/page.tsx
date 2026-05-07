'use client'

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
      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden grain"
        style={{ background: 'linear-gradient(160deg, #F2E8D8 0%, #E8D5BA 40%, #DEC8A8 100%)' }}
      >
        <div className="relative" style={{ width: 'min(384px, calc(100vw - 2rem))' }}>
          <div className="flex flex-col items-center mb-8">
            <ChoseIcon />
            <h1 className="text-3xl text-center leading-tight mt-4" style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F', fontStyle: 'italic' }}>
              Invalid Invite
            </h1>
          </div>
          <div
            className="rounded-2xl px-7 py-7 text-center"
            style={{
              background: 'rgba(253,250,245,0.88)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(225,210,190,0.6)',
              boxShadow: '0 8px 40px rgba(100,60,20,0.12)',
            }}
          >
            <p className="text-sm" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>{error}</p>
          </div>
          <Footer />
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden grain"
      style={{ background: 'linear-gradient(160deg, #F2E8D8 0%, #E8D5BA 40%, #DEC8A8 100%)' }}
    >
      {/* Atmospheric blobs */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-15%', left: '-10%',
          width: '60vw', height: '60vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(184,135,74,0.15) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-20%', right: '-10%',
          width: '50vw', height: '50vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(158,100,50,0.1) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      <div className="relative anim-scaleIn" style={{ animationDelay: '0.05s', width: 'min(384px, calc(100vw - 2rem))' }}>
        <div className="flex flex-col items-center mb-8 anim-fadeUp" style={{ animationDelay: '0.1s' }}>
          <ChoseIcon />
          <h1 className="text-3xl text-center leading-tight mt-4" style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F', fontStyle: 'italic' }}>
            You&apos;re invited
          </h1>
          <p className="text-sm mt-1.5 text-center" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
            {email ? <>Welcome, {email}. Set a password to get started.</> : 'Loading…'}
          </p>
        </div>

        <div
          className="rounded-2xl px-7 py-7 anim-fadeUp"
          style={{
            background: 'rgba(253,250,245,0.88)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(225,210,190,0.6)',
            boxShadow: '0 8px 40px rgba(100,60,20,0.12)',
            animationDelay: '0.18s',
          }}
        >
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)', letterSpacing: '0.07em', textTransform: 'uppercase' }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min. 8 characters"
                className="input-warm"
              />
            </div>
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)', letterSpacing: '0.07em', textTransform: 'uppercase' }}
              >
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
                className="input-warm"
              />
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(200,80,60,0.08)', border: '1px solid rgba(200,80,60,0.2)', color: '#A03020', fontFamily: 'var(--font-mulish)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending || !email}
              className="btn-gold w-full py-3 text-sm flex items-center justify-center gap-2 mt-1"
            >
              {pending ? 'Setting password…' : <><span>Set password & continue</span><span>→</span></>}
            </button>
          </form>
        </div>

        <Footer />
      </div>
    </div>
  )
}

function ChoseIcon() {
  return (
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #B8874A 0%, #8E6228 100%)',
        boxShadow: '0 8px 24px rgba(184,135,74,0.35)',
      }}
    >
      <span className="text-xl font-bold tracking-wide" style={{ color: '#FDFAF5', fontFamily: 'var(--font-mulish)' }}>
        C
      </span>
    </div>
  )
}

function Footer() {
  return (
    <div className="mt-8 flex flex-col items-center gap-1 anim-fadeIn" style={{ animationDelay: '0.35s' }}>
      <span className="text-xs font-bold" style={{ color: 'rgba(80,55,30,0.35)', fontFamily: 'var(--font-mulish)', letterSpacing: '0.2em' }}>CHOSEN</span>
      <p className="text-xs" style={{ color: 'rgba(80,55,30,0.35)', fontFamily: 'var(--font-mulish)' }}>
        Need help? <a href="mailto:hello@chosenapp.com" style={{ textDecoration: 'underline' }}>Contact us</a>
      </p>
    </div>
  )
}
