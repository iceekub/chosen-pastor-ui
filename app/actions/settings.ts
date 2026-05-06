'use server'

import { verifySession } from '@/lib/dal'
import { updateChurch } from '@/lib/api/churches'

export async function saveChurchAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const user = await verifySession()
  if (!user.church_id) return { error: 'No church associated with your account.' }

  const get = (key: string) => {
    const v = formData.get(key)
    return typeof v === 'string' && v.trim() !== '' ? v.trim() : null
  }

  try {
    // name, city, state, timezone are locked — only Chosen team can update
    // them via the super admin panel. We only allow alias, email, phone.
    await updateChurch(user.church_id, {
      alias:         get('church_alias'),
      contact_email: get('church_email'),
      contact_phone: get('church_phone'),
    })
    return { success: true }
  } catch (err) {
    return { error: `Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}` }
  }
}

export async function saveBibleTranslationAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const user = await verifySession()
  if (!user.church_id) return { error: 'No church associated with your account.' }

  const translation = (formData.get('bible_translation') as string)?.trim()
  if (!translation) return { error: 'No translation selected.' }

  try {
    await updateChurch(user.church_id, { bible_translation: translation })
    return { success: true }
  } catch (err) {
    return { error: `Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}` }
  }
}
