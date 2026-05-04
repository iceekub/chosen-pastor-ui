vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))
vi.mock('@/lib/session', () => ({
  setSession: vi.fn(),
  deleteSession: vi.fn(),
  getSession: vi.fn(),
}))
vi.mock('@/lib/api/auth', () => ({
  loginWithCredentials: vi.fn(),
  logoutSupabase: vi.fn(),
}))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { redirect } from 'next/navigation'
import { loginWithCredentials, logoutSupabase } from '@/lib/api/auth'
import { setSession, deleteSession, getSession } from '@/lib/session'
import { loginAction, logoutAction } from '@/app/actions/auth'
import { ApiError } from '@/lib/api/client'

const mockLogin = loginWithCredentials as ReturnType<typeof vi.fn>
const mockLogout = logoutSupabase as ReturnType<typeof vi.fn>
const mockSetSession = setSession as ReturnType<typeof vi.fn>
const mockDeleteSession = deleteSession as ReturnType<typeof vi.fn>
const mockGetSession = getSession as ReturnType<typeof vi.fn>
const mockRedirect = vi.mocked(redirect)

function makeForm(data: Record<string, string>) {
  const fd = new FormData()
  Object.entries(data).forEach(([k, v]) => fd.set(k, v))
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('loginAction — validation', () => {
  it('returns error when email is missing', async () => {
    const result = await loginAction(null, makeForm({ password: 'pw' }))
    expect(result.error).toBe('Email and password are required.')
  })

  it('returns error when password is missing', async () => {
    const result = await loginAction(null, makeForm({ email: 'a@b.com' }))
    expect(result.error).toBe('Email and password are required.')
  })

  it('returns error when both fields are empty', async () => {
    const result = await loginAction(null, makeForm({}))
    expect(result.error).toBe('Email and password are required.')
  })
})

describe('loginAction — API errors', () => {
  it('returns "Invalid email or password." on 401', async () => {
    mockLogin.mockRejectedValue(new ApiError(401, 'Unauthorized'))
    const result = await loginAction(null, makeForm({ email: 'a@b.com', password: 'wrong' }))
    expect(result.error).toBe('Invalid email or password.')
  })

  it('returns generic error on non-401 failure in test/production', async () => {
    mockLogin.mockRejectedValue(new Error('Network error'))
    const result = await loginAction(null, makeForm({ email: 'a@b.com', password: 'pw' }))
    expect(result.error).toBe('Unable to sign in. Please try again.')
  })
})

describe('loginAction — success', () => {
  it('calls setSession and redirects to /dashboard on success', async () => {
    const fakeUser = { id: '1', name: 'P', email: 'p@c.com', role: 'pastor', church_id: '1', church_name: 'Demo Church' }
    mockLogin.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
      user: fakeUser,
    })
    mockSetSession.mockResolvedValue(undefined)

    await expect(
      loginAction(null, makeForm({ email: 'p@c.com', password: 'pw' }))
    ).rejects.toThrow('NEXT_REDIRECT:/dashboard')

    expect(mockSetSession).toHaveBeenCalledWith({
      accessToken: 'access',
      refreshToken: 'refresh',
      user: fakeUser,
    })
  })
})

describe('logoutAction', () => {
  it('deletes the session and redirects to /login', async () => {
    mockGetSession.mockResolvedValue({ accessToken: 'access', refreshToken: 'r', user: {} })
    mockLogout.mockResolvedValue(undefined)
    mockDeleteSession.mockResolvedValue(undefined)

    await expect(logoutAction()).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(mockDeleteSession).toHaveBeenCalled()
  })

  it('still clears session and redirects even if Supabase logout throws', async () => {
    mockGetSession.mockResolvedValue({ accessToken: 'access', refreshToken: 'r', user: {} })
    mockLogout.mockRejectedValue(new Error('API down'))
    mockDeleteSession.mockResolvedValue(undefined)

    await expect(logoutAction()).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(mockDeleteSession).toHaveBeenCalled()
  })
})
