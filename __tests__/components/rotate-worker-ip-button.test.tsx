import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import { RotateWorkerIpButton } from '@/components/rotate-worker-ip-button'

const mockFetch = vi.fn()
beforeEach(() => {
  mockFetch.mockReset()
  vi.stubGlobal('fetch', mockFetch)
})

describe('<RotateWorkerIpButton />', () => {
  it('gates the rotation behind a confirm step', async () => {
    render(<RotateWorkerIpButton />)
    fireEvent.click(screen.getByRole('button', { name: /rotate worker ip/i }))

    // Confirm UI appears; no fetch yet.
    expect(screen.getByText(/restart the worker\?/i)).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ deployment_id: 'd-123', service: 'chosen-worker' }),
    })
    fireEvent.click(screen.getByRole('button', { name: /yes, rotate now/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/rotate-worker-ip', {
        method: 'POST',
      })
    })
    await waitFor(() => {
      expect(
        screen.getByText(/deployment d-123 started/i),
      ).toBeInTheDocument()
    })
  })

  it('cancel returns to the initial button without calling fetch', () => {
    render(<RotateWorkerIpButton />)
    fireEvent.click(screen.getByRole('button', { name: /rotate worker ip/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(
      screen.getByRole('button', { name: /rotate worker ip/i }),
    ).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('shows error message on failure', async () => {
    render(<RotateWorkerIpButton />)
    fireEvent.click(screen.getByRole('button', { name: /rotate worker ip/i }))
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Recently rotated; wait 42s' }),
    })
    fireEvent.click(screen.getByRole('button', { name: /yes, rotate now/i }))

    await waitFor(() => {
      expect(screen.getByText(/recently rotated/i)).toBeInTheDocument()
    })
  })
})
