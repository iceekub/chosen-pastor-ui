import { postgrest, edgeFunction } from './client'
import type { DeletionRequest } from './types'

// Embed the matched parishioner via the profile_id FK (disambiguated from the
// reviewed_by FK by the constraint name). RLS scopes rows to the caller's
// church automatically (super_admin sees all).
const DELETION_REQUEST_SELECT =
  'id,email,profile_id,church_id,reason,source,status,notes,' +
  'reviewed_by,reviewed_at,completed_at,created_at,updated_at,' +
  'matched_profile:profiles!deletion_requests_profile_id_fkey(name,role)'

export async function listDeletionRequests(): Promise<DeletionRequest[]> {
  return postgrest<DeletionRequest[]>(
    `/deletion_requests?select=${DELETION_REQUEST_SELECT}&order=created_at.desc`,
  )
}

/**
 * Approve (delete the account) or reject a pending request. Goes through the
 * `account-deletion-process` Edge Function, which holds the service role and
 * enforces the staff role + church scope. Returns the updated row.
 */
export async function processDeletionRequest(
  id: string,
  action: 'approve' | 'reject',
  notes?: string,
): Promise<DeletionRequest> {
  return edgeFunction<DeletionRequest>('account-deletion-process', {
    method: 'POST',
    body: { request_id: id, action, notes },
  })
}
