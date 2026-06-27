import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

import { BulkImportStartForm } from '@/components/bulk-import/start-form'

const mockFetch = vi.fn()
beforeEach(() => {
  mockFetch.mockReset()
  mockPush.mockReset()
  vi.stubGlobal('fetch', mockFetch)
})

describe('<BulkImportStartForm />', () => {
  it('accepts a Vimeo channel URL and prefills from initialUrl', () => {
    render(<BulkImportStartForm initialUrl="https://vimeo.com/therockmontana" />)
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe(
      'https://vimeo.com/therockmontana',
    )
    expect(
      screen.getByRole('button', { name: /scan channel/i }),
    ).not.toBeDisabled()
  })

  it('disables submit until a plausible channel URL is entered', () => {
    render(<BulkImportStartForm />)
    const submit = screen.getByRole('button', { name: /scan channel/i })
    expect(submit).toBeDisabled()

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'gibberish' },
    })
    expect(submit).toBeDisabled()
    expect(
      screen.getByText(/Paste a YouTube channel/i),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '@SBCFamilyOC' },
    })
    expect(submit).not.toBeDisabled()

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'https://www.youtube.com/@Example/videos' },
    })
    expect(submit).not.toBeDisabled()
  })

  it('posts the right body and navigates to the job detail page', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'job-xyz', status: 'discovering' }),
    })

    render(<BulkImportStartForm />)
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '@FirstChurch' },
    })
    // Tweak the "Weeks back" knob (the first spinbutton in the row)
    // to confirm the body picks it up.
    const [weeksInput] = screen.getAllByRole('spinbutton')
    fireEvent.change(weeksInput, { target: { value: '10' } })

    fireEvent.click(screen.getByRole('button', { name: /scan channel/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/bulk-imports')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body as string)
    expect(body.channel_url).toBe('@FirstChurch')
    expect(body.requested_count).toBe(10)
    expect(body.automatic).toBe(false)
    expect(body.force).toBe(false)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/sermons/bulk-import/job-xyz')
    })
  })

  it('surfaces a server error inline', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: 'channel not found' }),
    })

    render(<BulkImportStartForm />)
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '@Bogus' },
    })
    fireEvent.click(screen.getByRole('button', { name: /scan channel/i }))

    await waitFor(() => {
      expect(screen.getByText(/channel not found/i)).toBeInTheDocument()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('sends automatic + force flags when checked', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'job-2' }),
    })

    render(<BulkImportStartForm />)
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '@Auto' },
    })
    fireEvent.click(
      screen.getByLabelText(/Skip review and queue/i),
    )
    fireEvent.click(
      screen.getByLabelText(/Re-download videos we already have/i),
    )
    fireEvent.click(screen.getByRole('button', { name: /scan channel/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string)
    expect(body.automatic).toBe(true)
    expect(body.force).toBe(true)
  })
})
