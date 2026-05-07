'use server'

import { revalidatePath } from 'next/cache'
import { ApiError } from '@/lib/api/client'
import { inviteStaff } from '@/lib/api/staff'
import { verifySession } from '@/lib/dal'

export async function inviteStaffAction(
  _prev: { error?: string; success?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const user = await verifySession()

  const email = (formData.get('email') as string)?.trim()
  const name = (formData.get('name') as string)?.trim()

  if (!email || !name) {
    return { error: 'Name and email are required.' }
  }

  try {
    await inviteStaff({ email, name, role: 'staff', church_id: user.church_id ?? undefined })
  } catch (err) {
    if (err instanceof ApiError && err.status === 422) {
      return { error: 'That email already has an account.' }
    }
    return { error: 'Failed to send invite. Try again.' }
  }
  revalidatePath('/staff')
  return { success: `Invite sent to ${email}.` }
}

export async function resendInviteAction(
  _prev: { error?: string; success?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const user = await verifySession()

  const email = (formData.get('email') as string)?.trim()
  const name = (formData.get('name') as string)?.trim()

  if (!email || !name) {
    return { error: 'Email is required.' }
  }

  try {
    await inviteStaff({ email, name, role: 'staff', church_id: user.church_id ?? undefined })
  } catch (err) {
    if (err instanceof ApiError && err.status === 422) {
      return { error: 'This person has already accepted their invite.' }
    }
    return { error: 'Failed to resend invite. Try again.' }
  }
  return { success: `Invite resent to ${email}.` }
}
