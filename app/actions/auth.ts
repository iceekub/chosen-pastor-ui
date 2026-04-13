'use server'

import { redirect } from 'next/navigation'
import { loginWithCredentials, logoutApi } from '@/lib/api/auth'
import { setSession, deleteSession } from '@/lib/session'
import { ApiError } from '@/lib/api/client'

export async function loginAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  try {
    const { token, user } = await loginWithCredentials(email, password)
    await setSession(token, user)
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return { error: 'Invalid email or password.' }
    }
    // PLACEHOLDER: remove this fallback once the real API is connected
    if (process.env.NODE_ENV === 'development') {
      await setSession('placeholder-token', {
        id: '1',
        name: 'Pastor Demo',
        email,
        role: 'pastor',
        congregation_id: '1',
        congregation_name: 'Demo Church',
      })
    } else {
      return { error: 'Unable to sign in. Please try again.' }
    }
  }

  redirect('/dashboard')
}

export async function logoutAction(): Promise<void> {
  try {
    await logoutApi()
  } catch {
    // Best-effort — always clear the local session
  }
  await deleteSession()
  redirect('/login')
}
