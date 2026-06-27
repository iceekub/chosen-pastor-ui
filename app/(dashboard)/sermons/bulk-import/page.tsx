import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { BulkImportStartForm } from '@/components/bulk-import/start-form'

/**
 * Bulk YouTube channel import — phase 1 entrypoint.
 *
 * Staff pastes a channel URL; the form POSTs to /api/bulk-imports and
 * navigates to /sermons/bulk-import/{id} where the review (phase 2)
 * and progress (phase 3) screens take over.
 */
export default async function BulkImportLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>
}) {
  await verifySession()
  // Prefilled when arriving from the web-page importer's "Import channel →"
  // link (e.g. a church's Vimeo channel surfaced from their site).
  const { url } = await searchParams

  return (
    <div className="px-8 py-9 max-w-2xl mx-auto">
      <div className="mb-8 anim-fadeUp">
        <p className="section-label mb-2">Services</p>
        <h1
          className="text-4xl leading-tight"
          style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F', fontStyle: 'italic' }}
        >
          Bulk import from a channel.
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: '#7A6A58', fontFamily: 'var(--font-mulish)' }}
        >
          Point us at a YouTube or Vimeo channel and we&apos;ll find the most
          recent weeks&apos; services — one per week, longest version
          recommended. Review the picks, then we&apos;ll download them in the
          background with conservative pacing.
        </p>
      </div>

      <div className="surface p-6 anim-fadeUp" style={{ animationDelay: '0.1s' }}>
        <BulkImportStartForm initialUrl={url} />
      </div>

      <p
        className="text-xs mt-6 text-center"
        style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}
      >
        Just one service to import?{' '}
        <Link href="/sermons/upload" className="underline">
          Use the single-URL form instead
        </Link>
        .
      </p>
    </div>
  )
}
