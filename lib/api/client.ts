/**
 * Base API client for the Chosen backend.
 *
 * Usage (server components / server actions only):
 *   import { apiGet, apiPost } from '@/lib/api/client'
 *   const videos = await apiGet<VideoListItem[]>('/videos')
 */

import { cookies } from 'next/headers'

const API_BASE_URL = process.env.API_BASE_URL ?? 'https://api.chosenapp.com'

/**
 * Temporary: use a fixed bearer token while backend auth isn't fully built.
 * Set CHOSEN_API_TOKEN in .env.local. Once real auth is wired up, remove this
 * and rely solely on the cookie-based token.
 */
async function getAuthToken(): Promise<string | undefined> {
  const envToken = process.env.CHOSEN_API_TOKEN
  if (envToken) return envToken
  const cookieStore = await cookies()
  return cookieStore.get('chosen_token')?.value
}

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown }

async function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const token = await getAuthToken()
  const { body, headers: extraHeaders, ...rest } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extraHeaders as Record<string, string>),
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers,
    cache: 'no-store',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new ApiError(res.status, text)
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const apiGet = <T>(path: string, init?: RequestInit) =>
  apiFetch<T>(path, { method: 'GET', ...init })

export const apiPost = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'POST', body })

export const apiPut = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'PUT', body })

export const apiPatch = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'PATCH', body })

export const apiDelete = <T>(path: string) =>
  apiFetch<T>(path, { method: 'DELETE' })
