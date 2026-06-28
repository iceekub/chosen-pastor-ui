'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { loginAction } from '@/app/actions/auth'
import { PasswordInput } from '@/components/password-input'
import { SixSeedsMark } from '@/components/six-seeds-mark'

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, null)

  return (
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
          <form action={action} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold mb-1.5"
                style={{ color: 'rgba(254, 236, 211, 0.7)', fontFamily: 'var(--font-mulish)', letterSpacing: '0.07em', textTransform: 'uppercase' }}
              >
                Email
              </label>
              <input id="email" name="email" type="email" autoComplete="email" required className="input-dark" placeholder="pastor@yourchurch.com" />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold mb-1.5"
                style={{ color: 'rgba(254, 236, 211, 0.7)', fontFamily: 'var(--font-mulish)', letterSpacing: '0.07em', textTransform: 'uppercase' }}
              >
                Password
              </label>
              <PasswordInput id="password" name="password" autoComplete="current-password" required placeholder="••••••••" className="input-dark" />
              <div className="flex justify-end mt-2">
                <Link
                  href="/forgot-password"
                  className="text-xs py-1 px-1"
                  style={{ color: 'rgba(181, 210, 173, 0.6)', fontFamily: 'var(--font-mulish)', cursor: 'pointer' }}
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {state?.error && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(200, 80, 60, 0.12)', border: '1px solid rgba(200, 80, 60, 0.25)', color: '#F4A090', fontFamily: 'var(--font-mulish)' }}>
                {state.error}
              </div>
            )}

            <button type="submit" disabled={pending} className="btn-seed w-full py-4 mt-1 group">
              <span>{pending ? 'Signing in…' : 'Sign in'}</span>
              {!pending && (
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" style={{ color: '#B4926C' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              )}
            </button>
          </form>
        </div>

        <div className="mt-10 flex justify-center anim-fadeIn" style={{ animationDelay: '0.35s' }}>
          <p className="text-sm" style={{ color: 'rgba(181, 210, 173, 0.5)', fontFamily: 'var(--font-mulish)' }}>
            Need help?{' '}
            <a href="https://sixseeds.org/inquire" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(254, 236, 211, 0.6)', textDecoration: 'underline', cursor: 'pointer' }}>
              Contact us
            </a>
          </p>
        </div>
      </div>
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
        <a href="https://sixseeds.org/privacy" target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: 'rgba(181, 210, 173, 0.35)', fontFamily: 'var(--font-mulish)' }}>Privacy Policy</a>
        <a href="https://sixseeds.org/terms" target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: 'rgba(181, 210, 173, 0.35)', fontFamily: 'var(--font-mulish)' }}>Terms</a>
      </div>
    </div>
  )
}
