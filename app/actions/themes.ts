'use server'

import { revalidatePath } from 'next/cache'
import { createTheme, deleteTheme } from '@/lib/api/themes'
import { verifySession } from '@/lib/dal'

export async function createThemeAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await verifySession()
  if (user.role === 'parishioner') return { error: 'Only staff can manage themes.' }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Theme name is required.' }
  const image_url = (formData.get('image_url') as string)?.trim() || undefined

  try {
    await createTheme(name, image_url)
  } catch {
    return { error: 'Failed to create theme.' }
  }
  revalidatePath('/themes')
  return {}
}

export async function deleteThemeAction(formData: FormData): Promise<void> {
  const user = await verifySession()
  if (user.role === 'parishioner') return
  const id = formData.get('id') as string
  if (!id) return
  await deleteTheme(id).catch(() => {})
  revalidatePath('/themes')
}
