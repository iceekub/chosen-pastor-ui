import { verifySession } from '@/lib/dal'
import { listDeletionRequests } from '@/lib/api/deletionRequests'
import { AccountDeletionsClient } from '@/components/account-deletions-client'
import type { DeletionRequest } from '@/lib/api/types'

export default async function AccountDeletionsPage() {
  await verifySession()

  let requests: DeletionRequest[] = []
  let error: string | null = null
  try {
    requests = await listDeletionRequests()
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }

  return (
    <div className="px-8 py-9 max-w-5xl mx-auto">
      <div className="mb-8 anim-fadeUp">
        <h1
          className="text-4xl leading-tight"
          style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F', fontStyle: 'italic' }}
        >
          Account deletions.
        </h1>
        <p className="text-sm mt-1" style={{ color: '#7A6A58', fontFamily: 'var(--font-mulish)' }}>
          Review and approve requests to permanently delete a member&apos;s account and data.
          Nothing is deleted until you approve it.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded bg-red-50 border border-red-200 text-red-700 text-sm font-mono break-all">
          API error: {error}
        </div>
      )}

      <AccountDeletionsClient initialRequests={requests} />
    </div>
  )
}
