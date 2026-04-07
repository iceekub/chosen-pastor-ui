/**
 * Base API client for the Chosen backend.
 *
 * PLACEHOLDER: Set API_BASE_URL in .env.local when the Chosen team provides it.
 * All fetch calls go through here so the base URL and auth header are in one place.
 *
 * Usage (server components / server actions only):
 *   import { apiGet, apiPost } from '@/lib/api/client'
 *   const sermons = await apiGet<Sermon[]>('/library/sermons')
 */

import { cookies } from 'next/headers'

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4000'

async function getAuthToken(): Promise<string | undefined> {
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
