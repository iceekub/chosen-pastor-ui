'use client'

import { useEffect, useState, Suspense } from 'react'
import { PasswordInput } from '@/components/password-input'
import { SixSeedsMark } from '@/components/six-seeds-mark'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  { auth: { detectSessionInUrl: true } },
)

function AcceptInviteForm() {
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

  const pageShell = (children: React.ReactNode) => (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: '#062d25' }}
    >
      {/* Blobs */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute" style={{ top: '-20%', left: '-15%', width: '70vw', height: '70vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(8, 66, 54, 0.9) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute" style={{ top: '10%', right: '-10%', width: '55vw', height: '55vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(79, 113, 71, 0.5) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="absolute" style={{ bottom: '-25%', right: '-5%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(181, 210, 173, 0.18) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute" style={{ bottom: '-10%', left: '5%', width: '45vw', height: '45vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(180, 146, 108, 0.15) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="absolute inset-0" style={{ backdropFilter: 'blur(80px)', pointerEvents: 'none' }} />
      </div>
      <div className="relative anim-scaleIn" style={{ animationDelay: '0.05s', width: 'min(384px, calc(100vw - 2rem))', zIndex: 10 }}>
        {children}
      </div>
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
        <a href="https://sixseeds.org/privacy" target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: 'rgba(181, 210, 173, 0.35)', fontFamily: 'var(--font-mulish)' }}>Privacy Policy</a>
        <a href="https://sixseeds.org/terms" target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: 'rgba(181, 210, 173, 0.35)', fontFamily: 'var(--font-mulish)' }}>Terms</a>
      </div>
    </div>
  )

  if (error && !email) {
    return pageShell(
      <>
        <div className="flex justify-center items-center gap-3 mb-2 anim-fadeUp" style={{ animationDelay: '0.1s' }}>
          <SixSeedsMark size={32} />
          <span style={{ fontFamily: 'var(--font-bellota)', fontSize: '2.25rem', fontWeight: 700, color: '#FEECD3', letterSpacing: '0.06em', lineHeight: 1, textTransform: 'uppercase' }}>
            Six Seeds
          </span>
        </div>
        <p className="text-center mb-8 anim-fadeUp" style={{ animationDelay: '0.14s', fontFamily: 'var(--font-mulish)', fontSize: '1rem', fontWeight: 600, letterSpacing: '0.18em', color: '#B5D2AD' }}>
          CHURCH PORTAL
        </p>
        <div
          className="rounded-2xl px-7 py-7 text-center anim-fadeUp"
          style={{ background: 'rgba(255, 255, 255, 0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 8px 40px rgba(0, 0, 0, 0.3)', animationDelay: '0.18s' }}
        >
          <p className="text-sm font-semibold mb-2" style={{ color: '#FEECD3', fontFamily: 'var(--font-mulish)' }}>Invalid Invite</p>
          <p className="text-sm" style={{ color: 'rgba(181, 210, 173, 0.7)', fontFamily: 'var(--font-mulish)' }}>{error}</p>
        </div>
        <Footer />
      </>
    )
  }

  return pageShell(
    <>
      {/* Logo + wordmark */}
      <div className="flex justify-center items-center gap-3 mb-2 anim-fadeUp" style={{ animationDelay: '0.1s' }}>
        <SixSeedsMark size={32} />
        <span style={{ fontFamily: 'var(--font-bellota)', fontSize: '2.25rem', fontWeight: 700, color: '#FEECD3', letterSpacing: '0.06em', lineHeight: 1, textTransform: 'uppercase' }}>
          Six Seeds
        </span>
      </div>

      <p className="text-center mb-8 anim-fadeUp" style={{ animationDelay: '0.14s', fontFamily: 'var(--font-mulish)', fontSize: '1rem', fontWeight: 600, letterSpacing: '0.18em', color: '#B5D2AD' }}>
        CHURCH PORTAL
      </p>

      {/* Form card */}
      <div
        className="rounded-2xl px-7 py-7 anim-fadeUp"
        style={{ background: 'rgba(255, 255, 255, 0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 8px 40px rgba(0, 0, 0, 0.3)', animationDelay: '0.18s' }}
      >
        <p className="text-sm mb-4" style={{ color: 'rgba(181, 210, 173, 0.7)', fontFamily: 'var(--font-mulish)' }}>
          {email ? <>Welcome, {email}. Set a password to get started.</> : 'Loading…'}
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: 'rgba(254, 236, 211, 0.7)', fontFamily: 'var(--font-mulish)', letterSpacing: '0.07em', textTransform: 'uppercase' }}
            >
              Password
            </label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Min. 8 characters"
              className="input-dark"
            />
          </div>
          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: 'rgba(254, 236, 211, 0.7)', fontFamily: 'var(--font-mulish)', letterSpacing: '0.07em', textTransform: 'uppercase' }}
            >
              Confirm password
            </label>
            <PasswordInput
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
              className="input-dark"
            />
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(200, 80, 60, 0.12)', border: '1px solid rgba(200, 80, 60, 0.25)', color: '#F4A090', fontFamily: 'var(--font-mulish)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending || !email}
            className="btn-seed w-full py-4 mt-1 group"
          >
            <span>{pending ? 'Setting password…' : 'Set password & continue'}</span>
            {!pending && (
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" style={{ color: '#B4926C' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            )}
          </button>
        </form>
      </div>

      <Footer />
    </>
  )
}

// useSearchParams() forces this client page into a CSR bailout, which
// `next build` rejects unless it sits under a Suspense boundary. The fallback
// reuses the page background so there's no flash before hydration.
export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen"
          style={{ background: '#062d25' }}
        />
      }
    >
      <AcceptInviteForm />
    </Suspense>
  )
}

function Footer() {
  return (
    <div className="mt-10 flex justify-center anim-fadeIn" style={{ animationDelay: '0.35s' }}>
      <p className="text-sm" style={{ color: 'rgba(181, 210, 173, 0.5)', fontFamily: 'var(--font-mulish)' }}>
        Need help?{' '}
        <a href="https://sixseeds.org/inquire" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(254, 236, 211, 0.6)', textDecoration: 'underline', cursor: 'pointer' }}>
          Contact us
        </a>
      </p>
    </div>
  )
}
