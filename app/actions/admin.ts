'use server'

import { createChurch } from '@/lib/api/admin'
import { requireAdmin } from '@/lib/dal'

export async function createChurchAction(
  _prevState: { error?: string; success?: boolean; name?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean; name?: string }> {
  await requireAdmin()
  const name = formData.get('name') as string
  if (!name) return { error: 'Church name is required.' }

  const city = (formData.get('city') as string) || undefined
  const state = (formData.get('state') as string) || undefined
  const timezone = (formData.get('timezone') as string) || undefined
  const contact_email = (formData.get('contact_email') as string) || undefined
  const admin_email = (formData.get('admin_email') as string) || undefined

  try {
    const church = await createChurch({ name, city, state, timezone, contact_email, admin_email })
    return { success: true, name: church.name }
  } catch {
    return { error: 'Failed to create church.' }
  }
}

// `switchChurchAction` was removed: a super_admin's JWT lets them
// read/edit any church via RLS. The UI just needs a church-picker,
// not a re-auth step.
