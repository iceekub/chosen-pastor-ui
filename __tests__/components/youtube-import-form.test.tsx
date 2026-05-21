import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

import { YouTubeImportForm } from '@/components/youtube-import-form'

const mockFetch = vi.fn()
beforeEach(() => {
  mockFetch.mockReset()
  mockPush.mockReset()
  vi.stubGlobal('fetch', mockFetch)
})

describe('<YouTubeImportForm />', () => {
  it('disables the import button until a valid URL is entered', () => {
    render(<YouTubeImportForm />)
    const submit = screen.getByRole('button', { name: /import/i })
    expect(submit).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText(/youtube\.com/i), {
      target: { value: 'not-a-url' },
    })
    expect(submit).toBeDisabled()
    expect(
      screen.getByText(/paste a full youtube or facebook video url/i),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText(/youtube\.com/i), {
      target: { value: 'https://www.youtube.com/watch?v=abc123' },
    })
    expect(submit).not.toBeDisabled()
  })

  it('posts to /api/videos/youtube and navigates on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ video_id: 'vid-abc', status: 'downloading' }),
    })

    render(<YouTubeImportForm />)
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com/i), {
      target: { value: 'https://www.youtube.com/watch?v=abc' },
    })
    fireEvent.click(screen.getByRole('button', { name: /import/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/videos/youtube')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toMatchObject({
      youtube_url: 'https://www.youtube.com/watch?v=abc',
    })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/sermons/vid-abc')
    })
  })

  it('surfaces server error and offers the direct-upload fallback', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: 'ragserv unreachable' }),
    })

    render(<YouTubeImportForm />)
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com/i), {
      target: { value: 'https://youtu.be/abc' },
    })
    fireEvent.click(screen.getByRole('button', { name: /import/i }))

    await waitFor(() => {
      expect(screen.getByText(/ragserv unreachable/i)).toBeInTheDocument()
    })
    const fallback = screen.getByRole('link', { name: /upload the file directly/i })
    expect(fallback).toHaveAttribute('href', '/sermons/upload')
    expect(mockPush).not.toHaveBeenCalled()
  })
})
