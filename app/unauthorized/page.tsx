import Link from 'next/link'
import { SixSeedsMark } from '@/components/six-seeds-mark'

export default function UnauthorizedPage() {
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

        {/* Card */}
        <div
          className="rounded-2xl px-7 py-7 text-center anim-fadeUp"
          style={{ background: 'rgba(255, 255, 255, 0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 8px 40px rgba(0, 0, 0, 0.3)', animationDelay: '0.18s' }}
        >
          <p className="text-sm font-semibold mb-2" style={{ color: '#FEECD3', fontFamily: 'var(--font-mulish)' }}>
            Access restricted
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(181, 210, 173, 0.7)', fontFamily: 'var(--font-mulish)' }}>
            This portal is for pastors, staff, and administrators only. Your account does not have access to this application.
          </p>
          <p className="text-sm mt-3" style={{ color: 'rgba(181, 210, 173, 0.5)', fontFamily: 'var(--font-mulish)' }}>
            If you believe this is a mistake, please contact your church administrator.
          </p>
        </div>

        <div className="mt-6 flex justify-center anim-fadeIn" style={{ animationDelay: '0.25s' }}>
          <Link
            href="/login"
            className="text-sm"
            style={{ color: 'rgba(181, 210, 173, 0.5)', fontFamily: 'var(--font-mulish)', textDecoration: 'underline' }}
          >
            Sign in with a different account
          </Link>
        </div>

        <div className="mt-6 flex justify-center anim-fadeIn" style={{ animationDelay: '0.35s' }}>
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
