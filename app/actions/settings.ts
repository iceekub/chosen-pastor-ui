'use server'

import { verifySession } from '@/lib/dal'
import { updateChurch } from '@/lib/api/churches'

export async function saveSettingsAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const user = await verifySession()

  if (!user.church_id) {
    return { error: 'No church associated with your account.' }
  }

  const get = (key: string) => {
    const v = formData.get(key)
    return typeof v === 'string' && v.trim() !== '' ? v.trim() : null
  }

  try {
    await updateChurch(user.church_id, {
      name:              get('church_name') ?? undefined,
      city:              get('church_city'),
      state:             get('church_state'),
      contact_email:     get('church_email'),
      contact_phone:     get('church_phone'),
      timezone:          get('timezone'),
      bible_translation: get('bible_translation'),
    })
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { error: `Failed to save: ${msg}` }
  }
}
