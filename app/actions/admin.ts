'use server'

import { redirect } from 'next/navigation'
import { switchToChurch, createChurch } from '@/lib/api/admin'
import { requireAdmin } from '@/lib/dal'

export async function switchChurchAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  await requireAdmin()
  const church_id = formData.get('church_id') as string
  if (!church_id) return { error: 'Enter a valid church ID.' }

  try {
    await switchToChurch(church_id)
  } catch {
    return { error: 'Failed to switch church.' }
  }
  redirect('/dashboard')
}

export async function createChurchAction(
  _prevState: { error?: string; success?: boolean; name?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean; name?: string }> {
  await requireAdmin()
  const name = formData.get('name') as string

  if (!name) return { error: 'Church name is required.' }

  try {
    const church = await createChurch(name)
    return { success: true, name: church.name }
  } catch {
    return { error: 'Failed to create church.' }
  }
}
