// @vitest-environment node
// Mock server-only so it doesn't throw outside Next.js server context
vi.mock('server-only', () => ({}))
// Mock next/headers — not needed for encrypt/decrypt tests
vi.mock('next/headers', () => ({ cookies: vi.fn() }))

import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from '@/lib/session'
import type { Session } from '@/lib/session'

const mockSession: Session = {
  apiToken: 'test-api-token',
  user: {
    id: 1,
    name: 'Pastor Test',
    email: 'pastor@test.com',
    role: 'pastor',
    congregation_id: 42,
    congregation_name: 'Test Church',
  },
}

describe('session — encrypt / decrypt', () => {
  it('encrypt returns a JWT string', async () => {
    const token = await encrypt(mockSession)
    expect(typeof token).toBe('string')
    // JWTs have 3 dot-separated base64 parts
    expect(token.split('.')).toHaveLength(3)
  })

  it('decrypt round-trips the session payload', async () => {
    const token = await encrypt(mockSession)
    const result = await decrypt(token)
    expect(result?.user.id).toBe(mockSession.user.id)
    expect(result?.user.email).toBe(mockSession.user.email)
    expect(result?.apiToken).toBe(mockSession.apiToken)
  })

  it('decrypt returns null for a malformed token', async () => {
    const result = await decrypt('not.a.valid.jwt')
    expect(result).toBeNull()
  })

  it('decrypt returns null for a token signed with a different secret', async () => {
    // Manually craft a JWT with a different secret using jose
    const { SignJWT } = await import('jose')
    const wrongSecret = new TextEncoder().encode('wrong-secret')
    const badToken = await new SignJWT({ ...mockSession })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(wrongSecret)

    const result = await decrypt(badToken)
    expect(result).toBeNull()
  })

  it('decrypt returns null for an expired token', async () => {
    const { SignJWT } = await import('jose')
    const secret = new TextEncoder().encode(
      process.env.SESSION_SECRET ?? 'dev-secret-replace-in-production'
    )
    const expiredToken = await new SignJWT({ ...mockSession })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('-1s') // expired 1 second in the past
      .sign(secret)

    const result = await decrypt(expiredToken)
    expect(result).toBeNull()
  })
})
