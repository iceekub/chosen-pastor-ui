import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { PageImportFlow } from '@/components/page-import/page-import-flow'

/**
 * Import sermons from a web page.
 *
 * Staff pastes a page URL (e.g. a church's /sermons page); ragserv scrapes
 * it for YouTube/Vimeo links + embeds, and staff pick which to queue. The
 * queued videos download through the fetch fleet and show up on /downloads.
 */
export default async function ImportFromPagePage() {
  await verifySession()

  return (
    <div className="px-8 py-9 max-w-2xl mx-auto">
      <div className="mb-8 anim-fadeUp">
        <p className="section-label mb-2">Services</p>
        <h1
          className="text-4xl leading-tight"
          style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F', fontStyle: 'italic' }}
        >
          Import from a web page.
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: '#7A6A58', fontFamily: 'var(--font-mulish)' }}
        >
          Point us at a page that lists sermon videos — we&apos;ll find every
          YouTube and Vimeo video it links to or embeds. Pick the ones you
          want and we&apos;ll download them in the background.
        </p>
      </div>

      <PageImportFlow />

      <p
        className="text-xs mt-6 text-center"
        style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}
      >
        Importing a whole YouTube channel instead?{' '}
        <Link href="/sermons/bulk-import" className="underline">
          Bulk import from channel →
        </Link>
      </p>
    </div>
  )
}
