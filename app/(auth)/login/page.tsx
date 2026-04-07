'use client'

import { useActionState } from 'react'
import { loginAction } from '@/app/actions/auth'

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, null)

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden grain"
      style={{
        background: 'linear-gradient(160deg, #F2E8D8 0%, #E8D5BA 40%, #DEC8A8 100%)',
      }}
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
        {/* Church logo + heading */}
        <div className="flex flex-col items-center mb-8 anim-fadeUp" style={{ animationDelay: '0.1s' }}>
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: 'linear-gradient(135deg, #B8874A 0%, #8E6228 100%)',
              boxShadow: '0 8px 24px rgba(184,135,74,0.35)',
            }}
          >
            <span className="text-xl font-bold tracking-wide" style={{ color: '#FDFAF5', fontFamily: 'var(--font-mulish)' }}>
              BC
            </span>
          </div>
          <h1
            className="text-3xl text-center leading-tight"
            style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F', fontStyle: 'italic' }}
          >
            Pastor Portal
          </h1>
          <p className="text-sm mt-1.5" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
            Sign in to manage your church&apos;s content
          </p>
        </div>

        {/* Form card */}
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
          <form action={action} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold mb-1.5"
                style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)', letterSpacing: '0.07em', textTransform: 'uppercase' }}
              >
                Email
              </label>
              <input id="email" name="email" type="email" autoComplete="email" required className="input-warm" placeholder="pastor@yourchurch.com" />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold mb-1.5"
                style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)', letterSpacing: '0.07em', textTransform: 'uppercase' }}
              >
                Password
              </label>
              <input id="password" name="password" type="password" autoComplete="current-password" required className="input-warm" placeholder="••••••••" />
            </div>

            {state?.error && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(200,80,60,0.08)', border: '1px solid rgba(200,80,60,0.2)', color: '#A03020', fontFamily: 'var(--font-mulish)' }}>
                {state.error}
              </div>
            )}

            <button type="submit" disabled={pending} className="btn-gold w-full py-3 text-sm flex items-center justify-center gap-2 mt-1">
              {pending ? 'Signing in…' : <><span>Sign in</span><span>→</span></>}
            </button>
          </form>
        </div>

        {/* Chosen footer */}
        <div className="mt-8 flex flex-col items-center gap-1 anim-fadeIn" style={{ animationDelay: '0.35s' }}>
          <span className="text-xs font-bold" style={{ color: 'rgba(80,55,30,0.35)', fontFamily: 'var(--font-mulish)', letterSpacing: '0.2em' }}>CHOSEN</span>
          <p className="text-xs" style={{ color: 'rgba(80,55,30,0.35)', fontFamily: 'var(--font-mulish)' }}>
            Need help? <a href="mailto:hello@chosenapp.com" style={{ textDecoration: 'underline' }}>Contact us</a>
          </p>
        </div>
      </div>
    </div>
  )
}
