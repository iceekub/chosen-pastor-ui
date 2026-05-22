/**
 * Bulk YouTube channel import — server-side helpers.
 *
 * Mirrors ragserv's `/bulk-imports` endpoints. All calls go through the
 * `ragserv` helper which carries the session bearer.
 *
 * Used by:
 *   - `app/(dashboard)/sermons/bulk-import/[id]/page.tsx` for the initial
 *     server-side fetch on the review/progress screen.
 *   - The Next API proxy routes under `app/api/bulk-imports/` for
 *     client-component calls.
 */

import { ragserv } from './client'
import type {
  BulkImportCreatePayload,
  BulkImportJob,
  BulkImportJobDetail,
} from './types'

export async function createBulkImport(
  payload: BulkImportCreatePayload,
): Promise<BulkImportJob> {
  // Discovery dispatches a Celery task and returns a job in
  // status='discovering'. The UI polls /bulk-imports/{id} from there.
  return ragserv<BulkImportJob>('/bulk-imports', {
    method: 'POST',
    body: payload,
  })
}

export async function getBulkImport(jobId: string): Promise<BulkImportJobDetail> {
  return ragserv<BulkImportJobDetail>(`/bulk-imports/${jobId}`, {
    method: 'GET',
  })
}

export async function listBulkImports(
  jobStatus?: string,
): Promise<BulkImportJob[]> {
  // jobStatus='active' returns any non-terminal job (discovering / queued /
  // running) — used by the dashboard to surface in-flight imports.
  const qs = jobStatus ? `?status=${encodeURIComponent(jobStatus)}` : ''
  return ragserv<BulkImportJob[]>(`/bulk-imports${qs}`, { method: 'GET' })
}

export async function startBulkImport(
  jobId: string,
  selectedItemIds: string[],
): Promise<BulkImportJob> {
  // Confirms the user's selections (overwrites is_selected on every
  // pending item) and flips status -> queued. 409 if the job isn't
  // currently in awaiting_review.
  return ragserv<BulkImportJob>(`/bulk-imports/${jobId}/start`, {
    method: 'POST',
    body: { selected_item_ids: selectedItemIds },
  })
}

export async function stopBulkImport(jobId: string): Promise<BulkImportJob> {
  // Flips status -> stopped. Orchestrator finishes its current item
  // (cannot abort an in-flight yt-dlp call), then exits; pending items
  // get cancelled. 409 if already terminal.
  return ragserv<BulkImportJob>(`/bulk-imports/${jobId}/stop`, {
    method: 'POST',
    body: {},
  })
}
