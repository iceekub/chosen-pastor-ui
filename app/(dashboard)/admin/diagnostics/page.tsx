import { requireAdmin } from '@/lib/dal'
import { RotateWorkerIpButton } from '@/components/rotate-worker-ip-button'

export default async function AdminDiagnosticsPage() {
  await requireAdmin()

  return (
    <div className="px-8 py-9 max-w-2xl mx-auto">
      <div className="mb-8 anim-fadeUp">
        <p className="section-label mb-2">Admin</p>
        <h1
          className="text-4xl leading-tight"
          style={{
            fontFamily: 'var(--font-playfair)',
            color: '#2C1E0F',
            fontStyle: 'italic',
          }}
        >
          Diagnostics.
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: '#7A6A58', fontFamily: 'var(--font-mulish)' }}
        >
          Tools for operating the ingest pipeline. Super-admin only.
        </p>
      </div>

      <section
        className="surface p-6 anim-fadeUp"
        style={{ animationDelay: '0.1s' }}
      >
        <h2
          className="text-base mb-2"
          style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F' }}
        >
          Rotate worker IP
        </h2>
        <p
          className="text-xs mb-4"
          style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}
        >
          When YouTube starts blocking us (look for {' '}
          <span className="font-mono">RATE_LIMITED</span> or {' '}
          <span className="font-mono">IP_BLOCKED</span> in a sermon&apos;s
          download diagnostics), rotating the worker gives us a fresh egress IP
          from AWS&apos;s pool. The next download attempt also tries the IPv6
          family, which Google&apos;s blocklists tend to miss.
        </p>
        <RotateWorkerIpButton />
      </section>
    </div>
  )
}
