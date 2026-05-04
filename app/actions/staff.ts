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
  if (user.role === 'parishioner') {
    return { error: 'Only staff and pastors can invite.' }
  }

  const email = (formData.get('email') as string)?.trim()
  const name = (formData.get('name') as string)?.trim()
  const role = formData.get('role') as 'pastor' | 'staff'

  if (!email || !name || !role) {
    return { error: 'Email, name, and role are required.' }
  }
  if (role !== 'pastor' && role !== 'staff') {
    return { error: 'Role must be pastor or staff.' }
  }

  try {
    await inviteStaff({ email, name, role })
  } catch (err) {
    if (err instanceof ApiError && err.status === 422) {
      return { error: 'That email already has an account.' }
    }
    return { error: 'Failed to send invite. Try again.' }
  }
  revalidatePath('/staff')
  return { success: `Invite sent to ${email}.` }
}
