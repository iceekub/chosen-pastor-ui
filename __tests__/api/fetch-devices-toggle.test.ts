/**
 * POST /api/fetch/devices/[id]/[action] — the super-admin kill switch
 * proxy. requireAdmin gates it; ragserv errors surface as API errors.
 */

vi.mock('server-only', () => ({}))
vi.mock('@/lib/dal', () => ({ requireAdmin: vi.fn() }))
vi.mock('@/lib/api/fetch', () => ({
  enableFetchDevice: vi.fn(),
  disableFetchDevice: vi.fn(),
}))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireAdmin } from '@/lib/dal'
import { disableFetchDevice, enableFetchDevice } from '@/lib/api/fetch'
import { POST } from '@/app/api/fetch/devices/[id]/[action]/route'

const mockRequireAdmin = requireAdmin as ReturnType<typeof vi.fn>
const mockDisable = disableFetchDevice as ReturnType<typeof vi.fn>
const mockEnable = enableFetchDevice as ReturnType<typeof vi.fn>

function call(action: string) {
  return POST(new Request('http://localhost', { method: 'POST' }), {
    params: Promise.resolve({ id: 'dev-1', action }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAdmin.mockResolvedValue({ id: 'u1', role: 'super_admin' })
})

describe('POST /api/fetch/devices/[id]/[action]', () => {
  it('redirect from requireAdmin propagates (non-admins never reach ragserv)', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('NEXT_REDIRECT'))
    await expect(call('disable')).rejects.toThrow('NEXT_REDIRECT')
    expect(mockDisable).not.toHaveBeenCalled()
  })

  it('disable delegates with the device id', async () => {
    mockDisable.mockResolvedValue({ id: 'dev-1', enabled: false, status: 'disabled' })
    const res = await call('disable')
    expect(res.status).toBe(200)
    expect(mockDisable).toHaveBeenCalledWith('dev-1')
    expect((await res.json()).enabled).toBe(false)
  })

  it('enable delegates too', async () => {
    mockEnable.mockResolvedValue({ id: 'dev-1', enabled: true, status: 'offline' })
    const res = await call('enable')
    expect(res.status).toBe(200)
    expect(mockEnable).toHaveBeenCalledWith('dev-1')
  })

  it('unknown action → 400 without touching ragserv', async () => {
    const res = await call('explode')
    expect(res.status).toBe(400)
    expect(mockDisable).not.toHaveBeenCalled()
    expect(mockEnable).not.toHaveBeenCalled()
  })

  it('ragserv failure → 502 with the message', async () => {
    mockDisable.mockRejectedValue(new Error('fetch failed'))
    const res = await call('disable')
    expect(res.status).toBe(502)
    expect((await res.json()).error).toBe('fetch failed')
  })
})
