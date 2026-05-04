vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
// redirect() in Next.js throws a special error to stop execution — simulate that
vi.mock('next/navigation', () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import type { Session } from '@/lib/session'

const mockGetSession = getSession as ReturnType<typeof vi.fn>
const mockRedirect = vi.mocked(redirect)

const mockSession: Session = {
  accessToken: 'access-token-test', refreshToken: 'refresh-token-test',
  user: {
    id: '1', name: 'Pastor', email: 'p@test.com',
    role: 'pastor', church_id: '1', church_name: 'Demo Church',
  },
}

const adminSession: Session = {
  ...mockSession,
  user: { ...mockSession.user, role: 'super_admin' },
}

beforeEach(() => {
  vi.clearAllMocks()
  // React cache wraps the function — re-import fresh each test via clearAllMocks
})

describe('verifySession', () => {
  it('returns the user when a valid session exists', async () => {
    mockGetSession.mockResolvedValue(mockSession)
    // Re-import to bust the React cache between tests
    const { verifySession } = await import('@/lib/dal')
    const user = await verifySession()
    expect(user.id).toBe('1')
    expect(user.email).toBe('p@test.com')
  })

  it('calls redirect("/login") when session is null', async () => {
    mockGetSession.mockResolvedValue(null)
    const { verifySession } = await import('@/lib/dal')
    await expect(verifySession()).rejects.toThrow('NEXT_REDIRECT:/login')
  })
})

describe('requireAdmin', () => {
  it('returns the user when role is super_admin', async () => {
    mockGetSession.mockResolvedValue(adminSession)
    const { requireAdmin } = await import('@/lib/dal')
    const user = await requireAdmin()
    expect(user.role).toBe('super_admin')
  })

  it('calls redirect("/dashboard") when role is pastor', async () => {
    mockGetSession.mockResolvedValue(mockSession)
    const { requireAdmin } = await import('@/lib/dal')
    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT:/dashboard')
  })
})
