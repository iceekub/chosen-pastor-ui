'use server'

import { revalidatePath } from 'next/cache'
import { createDocument } from '@/lib/api/documents'
import { verifySession } from '@/lib/dal'

export async function createDocumentAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  await verifySession()
  const title = formData.get('title') as string
  const content = formData.get('content') as string

  if (!title || !content) return { error: 'Title and content are required.' }

  try {
    await createDocument(title, content)
    revalidatePath('/documents')
    return { success: true }
  } catch {
    return { error: 'Failed to add document. Please try again.' }
  }
}
