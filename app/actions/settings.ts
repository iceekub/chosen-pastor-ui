'use server'

import { verifySession } from '@/lib/dal'

export async function saveSettingsAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  await verifySession()
  // PLACEHOLDER: call the Chosen backend to update church/pastor profile
  // await apiPut('/church/settings', { ... })
  return { success: true }
}
