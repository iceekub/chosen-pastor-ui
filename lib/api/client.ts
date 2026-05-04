/**
 * HTTP clients for the two backends Chosen talks to.
 *
 * - `postgrest()` — PostgREST (auto-generated REST over the schema). Used
 *   for all reads and edits. Auth: Supabase access token from the session.
 * - `ragserv()` — sermon upload + AI pipeline. Used for: presign upload,
 *   upload-complete, generate-gardens, document upload. Auth: same
 *   Supabase access token (ragserv verifies it directly).
 *
 * Both helpers run server-side (server components / server actions) and
 * pull the access token from the session cookie.
 */

import 'server-only'

import { getSession } from '@/lib/session'

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const RAGSERV_URL = process.env.NEXT_PUBLIC_RAGSERV_URL!

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set — API calls will fail.',
  )
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

type FetchInit = Omit<RequestInit, 'body'> & { body?: unknown }

async function authedFetch(
  url: string,
  init: FetchInit,
  extraHeaders: Record<string, string> = {},
): Promise<Response> {
  const session = await getSession()
  const { body, headers, ...rest } = init
  const composed: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
    ...(headers as Record<string, string> | undefined),
  }
  if (session?.accessToken) {
    composed.Authorization = `Bearer ${session.accessToken}`
  }
  return fetch(url, {
    ...rest,
    headers: composed,
    cache: 'no-store',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new ApiError(res.status, text)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ───── PostgREST ─────

export interface PgrstOptions extends FetchInit {
  /** Set `Prefer: return=representation` for inserts/updates that should return the row */
  returnRows?: boolean
  /** Set `Accept: application/vnd.pgrst.object+json` to get a single object instead of an array */
  singleRow?: boolean
}

export async function postgrest<T>(
  path: string,
  options: PgrstOptions = {},
): Promise<T> {
  const { returnRows, singleRow, ...init } = options
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
  }
  if (returnRows) headers.Prefer = 'return=representation'
  if (singleRow) headers.Accept = 'application/vnd.pgrst.object+json'

  const res = await authedFetch(`${SUPABASE_URL}/rest/v1${path}`, init, headers)
  return parseOrThrow<T>(res)
}

// ───── Ragserv ─────

export async function ragserv<T>(path: string, options: FetchInit = {}): Promise<T> {
  const res = await authedFetch(`${RAGSERV_URL}${path}`, options)
  return parseOrThrow<T>(res)
}

// ───── Edge Functions (Supabase) ─────

export async function edgeFunction<T>(
  name: string,
  options: FetchInit = {},
): Promise<T> {
  const res = await authedFetch(`${SUPABASE_URL}/functions/v1/${name}`, options, {
    apikey: SUPABASE_ANON_KEY,
  })
  return parseOrThrow<T>(res)
}
