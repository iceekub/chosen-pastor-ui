import Link from 'next/link'
import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { getBulkImport } from '@/lib/api/bulkImports'
import { ApiError } from '@/lib/api/client'
import { BulkImportFlow } from '@/components/bulk-import/flow'

/**
 * Bulk-import detail — drives both the phase-2 (awaiting_review) and
 * phase-3 (queued/running/stopped/completed) screens via the
 * `<BulkImportFlow />` client component. The server fetch hydrates the
 * initial state; client-side polling keeps it fresh.
 */
export default async function BulkImportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await verifySession()
  const { id } = await params

  let job
  try {
    job = await getBulkImport(id)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound()
    }
    throw err
  }

  return (
    <div className="px-8 py-9 max-w-4xl mx-auto">
      <div className="mb-6 anim-fadeUp">
        <p className="section-label mb-2">Services</p>
        <h1
          className="text-3xl leading-tight"
          style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F', fontStyle: 'italic' }}
        >
          Bulk import.
        </h1>
        <p
          className="text-xs mt-1"
          style={{ color: '#7A6A58', fontFamily: 'var(--font-mulish)' }}
        >
          <Link href="/sermons/bulk-import" className="underline">
            Start a new import
          </Link>
          {' · '}
          <Link href="/sermons" className="underline">
            Back to sermons
          </Link>
        </p>
      </div>

      <BulkImportFlow initialJob={job} />
    </div>
  )
}
