'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { loginWithCredentials, logoutSupabase } from '@/lib/api/auth'
import { ApiError, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/api/client'
import { deleteSession, getSession, setSession } from '@/lib/session'

export async function loginAction(
  _prevState: { error?: string } | null,
  formData: FormData,
): Promise<{ error: string }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  try {
    const { accessToken, refreshToken, user } = await loginWithCredentials(email, password)
    await setSession({ accessToken, refreshToken, user })
  } catch (err) {
    if (err instanceof ApiError && err.status === 400) {
      return { error: 'Invalid email or password.' }
    }
    if (err instanceof ApiError && err.status === 401) {
      return { error: 'Invalid email or password.' }
    }
    return { error: 'Unable to sign in. Please try again.' }
  }

  redirect('/dashboard')
}

export async function forgotPasswordAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const email = (formData.get('email') as string | null)?.trim()
  if (!email) return { error: 'Email is required.' }

  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const proto = headersList.get('x-forwarded-proto') ?? 'http'
  const redirectTo = `${proto}://${host}/auth/reset-password`

  await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, redirect_to: redirectTo }),
  })

  // Always succeed to prevent email enumeration.
  return { success: true }
}

export async function logoutAction(): Promise<void> {
  const session = await getSession()
  if (session?.accessToken) {
    try {
      await logoutSupabase(session.accessToken)
    } catch {
      // Best-effort — always clear the local session.
    }
  }
  await deleteSession()
  redirect('/login')
}
