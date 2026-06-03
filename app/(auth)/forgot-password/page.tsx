'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { forgotPasswordAction } from '@/app/actions/auth'

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPasswordAction, null)

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: '#062d25' }}
    >
      {/* Blobs */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute" style={{ top: '-20%', left: '-15%', width: '70vw', height: '70vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(8,66,54,0.9) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute" style={{ top: '10%', right: '-10%', width: '55vw', height: '55vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,113,71,0.5) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="absolute" style={{ bottom: '-25%', right: '-5%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(181,210,173,0.18) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute inset-0" style={{ backdropFilter: 'blur(80px)' }} />
      </div>

      <div className="relative anim-scaleIn" style={{ animationDelay: '0.05s', width: 'min(384px, calc(100vw - 2rem))', zIndex: 1 }}>
        <div className="flex justify-center mb-2 anim-fadeUp" style={{ animationDelay: '0.1s' }}>
          <img src="/six-seeds-logo.svg" alt="Six Seeds" height={40} style={{ height: 40 }} />
        </div>

        <p className="text-center mb-8 anim-fadeUp" style={{ animationDelay: '0.14s', fontFamily: 'var(--font-mulish)', fontSize: '1rem', fontWeight: 600, letterSpacing: '0.18em', color: '#B5D2AD' }}>
          CHURCH PORTAL
        </p>

        <div
          className="rounded-2xl px-7 py-7 anim-fadeUp"
          style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 40px rgba(0,0,0,0.3)', animationDelay: '0.18s' }}
        >
          {state?.success ? (
            <div className="text-center py-4">
              <p className="text-sm font-semibold mb-2" style={{ color: '#FEECD3', fontFamily: 'var(--font-mulish)' }}>
                Check your email
              </p>
              <p className="text-sm" style={{ color: 'rgba(181,210,173,0.7)', fontFamily: 'var(--font-mulish)' }}>
                If an account exists for that address, we&apos;ve sent a password reset link.
              </p>
              <Link
                href="/login"
                className="inline-block mt-6 text-xs underline"
                style={{ color: 'rgba(254,236,211,0.5)', fontFamily: 'var(--font-mulish)' }}
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form action={action} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold mb-1.5"
                  style={{ color: 'rgba(254,236,211,0.7)', fontFamily: 'var(--font-mulish)', letterSpacing: '0.07em', textTransform: 'uppercase' }}
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input-dark"
                  placeholder="pastor@yourchurch.com"
                />
              </div>

              {state?.error && (
                <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(200,80,60,0.12)', border: '1px solid rgba(200,80,60,0.25)', color: '#F4A090', fontFamily: 'var(--font-mulish)' }}>
                  {state.error}
                </div>
              )}

              <button type="submit" disabled={pending} className="btn-seed w-full py-4 mt-1 group">
                <span>{pending ? 'Sending…' : 'Send reset link'}</span>
                {!pending && (
                  <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" style={{ color: '#B4926C' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                )}
              </button>

              <div className="text-center pt-1">
                <Link
                  href="/login"
                  className="text-xs"
                  style={{ color: 'rgba(181,210,173,0.5)', fontFamily: 'var(--font-mulish)', textDecoration: 'underline' }}
                >
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
