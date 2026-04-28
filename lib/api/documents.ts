import { apiGet, apiPut, apiDelete } from './client'
import type { Document, Tag } from './types'

export async function getDocuments(): Promise<Document[]> {
  return apiGet<Document[]>('/library/documents')
}

export async function createDocument(
  title: string,
  content: string
): Promise<Document> {
  return apiPut<Document>('/library/documents/create', { title, content })
}

export async function deleteDocument(id: number): Promise<void> {
  return apiDelete(`/library/documents/${id}`)
}

export async function getTags(): Promise<Tag[]> {
  return apiGet<Tag[]>('/library/tags')
}

export async function createTag(name: string): Promise<Tag> {
  return apiPut<Tag>('/library/tags/create', { name })
}
