'use server'

import { redirect } from 'next/navigation'
import { createChurch, inviteToChurch } from '@/lib/api/admin'
import { requireAdmin } from '@/lib/dal'
import { setEmulatedChurch, clearEmulatedChurch } from '@/lib/session'

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

/** Switch the emulated church context and redirect to the dashboard. */
export async function switchChurchAction(id: string, name: string): Promise<void> {
  await requireAdmin()
  await setEmulatedChurch({ id, name })
  redirect('/dashboard')
}

/** Clear emulation and return to the super-admin's own view. */
export async function clearChurchSwitchAction(): Promise<void> {
  await requireAdmin()
  await clearEmulatedChurch()
  redirect('/dashboard')
}

export async function inviteToChurchAction(
  _prevState: { error?: string; success?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  await requireAdmin()

  const church_id = (formData.get('church_id') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const name = (formData.get('name') as string)?.trim()

  if (!church_id || !email || !name) return { error: 'All fields are required.' }

  try {
    await inviteToChurch({ church_id, email, name })
    return { success: `Invite sent to ${email}.` }
  } catch {
    return { error: 'Failed to send invite. The address may already have an account.' }
  }
}
