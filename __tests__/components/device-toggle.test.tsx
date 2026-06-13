const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DeviceToggle } from '@/components/fleet/device-toggle'
import { makeFetchDevice } from '../factories'

const mockFetch = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', mockFetch)
})

describe('<DeviceToggle />', () => {
  it('gates disable behind an inline confirm', async () => {
    render(<DeviceToggle device={makeFetchDevice({ id: 'd1', enabled: true })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Disable' }))

    expect(screen.getByText(/out of rotation/i)).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()

    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ enabled: false }) })
    fireEvent.click(screen.getByRole('button', { name: /yes, disable/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/fetch/devices/d1/disable', {
        method: 'POST',
      })
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('offers Enable for a disabled device', async () => {
    render(
      <DeviceToggle
        device={makeFetchDevice({ id: 'd2', enabled: false, status: 'disabled' })}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Enable' }))
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ enabled: true }) })
    fireEvent.click(screen.getByRole('button', { name: /yes, enable/i }))
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/fetch/devices/d2/enable', {
        method: 'POST',
      })
    })
  })

  it('cancel backs out without a request', () => {
    render(<DeviceToggle device={makeFetchDevice({ enabled: true })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Disable' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: 'Disable' })).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('surfaces server errors inline', async () => {
    render(<DeviceToggle device={makeFetchDevice({ id: 'd3', enabled: true })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Disable' }))
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: 'ragserv unreachable' }),
    })
    fireEvent.click(screen.getByRole('button', { name: /yes, disable/i }))
    await waitFor(() => {
      expect(screen.getByText('ragserv unreachable')).toBeInTheDocument()
    })
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})
