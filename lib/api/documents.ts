import { postgrest, ragserv } from './client'
import type { Document, Tag } from './types'

// ─── Reads (PostgREST) ─────────────────────────────────────────────────────

export async function getDocuments(churchId?: string | null): Promise<Document[]> {
  const churchFilter = churchId ? `&church_id=eq.${churchId}` : ''
  return postgrest<Document[]>(`/documents?select=*${churchFilter}&order=created_at.desc`)
}

export async function getTags(churchId?: string | null): Promise<Tag[]> {
  const churchFilter = churchId ? `&church_id=eq.${churchId}` : ''
  return postgrest<Tag[]>(`/tags?select=*${churchFilter}&order=name.asc`)
}

// ─── Writes ────────────────────────────────────────────────────────────────

/** Create a text document. Goes through ragserv so it gets indexed in Ragie. */
export async function createDocument(
  title: string,
  content: string,
): Promise<Document> {
  return ragserv<Document>('/documents', {
    method: 'POST',
    body: { title, content },
  })
}

export async function deleteDocument(id: string): Promise<void> {
  await postgrest(`/documents?id=eq.${id}`, { method: 'DELETE' })
}

/** Tags are simple — managed directly via PostgREST (RLS scopes by church). */
export async function createTag(name: string): Promise<Tag> {
  return postgrest<Tag>('/tags', {
    method: 'POST',
    body: { name },
    returnRows: true,
    singleRow: true,
  })
}
