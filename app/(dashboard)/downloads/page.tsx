import { verifySession } from '@/lib/dal'
import { getActiveDownloads, getRecentDownloadHistory } from '@/lib/api/fetch'
import { DownloadsList } from '@/components/downloads/downloads-list'
import type { DownloadVideoRow } from '@/lib/api/types'

/** How far back "recently completed / failed" looks. */
const HISTORY_DAYS = 7

export default async function DownloadsPage() {
  const user = await verifySession()
  const isAdmin = user.role === 'super_admin'
  // Staff are church-scoped by RLS anyway; super_admins follow their
  // emulated church when one is active (verifySession already swaps
  // church_id), otherwise they see every church.
  const churchId = user.church_id

  let active: DownloadVideoRow[] = []
  let history: DownloadVideoRow[] = []
  let loadError: string | null = null
  try {
    ;[active, history] = await Promise.all([
      getActiveDownloads(churchId),
      getRecentDownloadHistory(churchId, HISTORY_DAYS),
    ])
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e)
  }

  return (
    <div className="px-8 py-9 max-w-6xl mx-auto">
      <div className="mb-8 anim-fadeUp">
        <h1
          className="text-4xl leading-tight"
          style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F', fontStyle: 'italic' }}
        >
          Downloads.
        </h1>
        <p className="text-sm mt-1" style={{ color: '#7A6A58', fontFamily: 'var(--font-mulish)' }}>
          YouTube imports in flight and from the last {HISTORY_DAYS} days. Reload the page for the
          latest status.
        </p>
      </div>

      {loadError && (
        <div className="mb-4 p-4 rounded bg-red-50 border border-red-200 text-red-700 text-sm font-mono break-all">
          API error: {loadError}
        </div>
      )}

      <DownloadsList
        rows={[...active, ...history]}
        isAdmin={isAdmin}
        showChurch={isAdmin && !churchId}
      />
    </div>
  )
}
