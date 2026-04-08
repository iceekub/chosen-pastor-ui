import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VideoUpload } from '@/components/video-upload'
import type { Tag } from '@/lib/api/types'

const mockTags: Tag[] = [
  { id: 1, name: 'Worship' },
  { id: 2, name: 'Prayer' },
]

// Helper to create a fake video File
function makeVideoFile(name = 'sermon.mp4', size = 1024 * 1024) {
  return new File(['x'.repeat(size)], name, { type: 'video/mp4' })
}

// Stub XMLHttpRequest so S3 uploads resolve/reject immediately
function mockXHR(succeed = true) {
  // Must use a real function (not arrow) so it can be used with `new`
  function MockXHR(this: {
    open: ReturnType<typeof vi.fn>
    setRequestHeader: ReturnType<typeof vi.fn>
    send: ReturnType<typeof vi.fn>
    upload: { onprogress: null }
    onload: (() => void) | null
    onerror: (() => void) | null
    status: number
  }) {
    this.open = vi.fn()
    this.setRequestHeader = vi.fn()
    this.upload = { onprogress: null }
    this.onload = null
    this.onerror = null
    this.status = succeed ? 200 : 500
    this.send = vi.fn().mockImplementation(() => {
      setTimeout(() => {
        if (succeed) {
          this.onload?.()
        } else {
          this.onerror?.()
        }
      }, 0)
    })
  }
  vi.stubGlobal('XMLHttpRequest', MockXHR)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('VideoUpload — idle state', () => {
  it('renders file picker and title field', () => {
    render(<VideoUpload tags={[]} />)
    expect(screen.getByText(/click to select a video file/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/sunday sermon/i)).toBeInTheDocument()
  })

  it('submit button is disabled when no file is selected', () => {
    render(<VideoUpload tags={[]} />)
    expect(screen.getByRole('button', { name: /upload sermon/i })).toBeDisabled()
  })

  it('submit button is disabled when title is empty even with a file', async () => {
    render(<VideoUpload tags={[]} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = makeVideoFile('video.mp4')
    await userEvent.upload(input, file)

    // Clear the auto-filled title
    await userEvent.clear(screen.getByPlaceholderText(/sunday sermon/i))

    expect(screen.getByRole('button', { name: /upload sermon/i })).toBeDisabled()
  })
})

describe('VideoUpload — file selection', () => {
  it('auto-fills title from filename (without extension)', async () => {
    render(<VideoUpload tags={[]} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeVideoFile('easter-sunday.mp4'))
    expect(screen.getByDisplayValue('easter-sunday')).toBeInTheDocument()
  })

  it('shows filename and size after file is picked', async () => {
    render(<VideoUpload tags={[]} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeVideoFile('sermon.mp4'))
    expect(screen.getByText('sermon.mp4')).toBeInTheDocument()
  })

  it('clears any previous error when a new file is selected', async () => {
    // Simulate an upload failure first
    mockXHR(false)
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'oops' }),
    })

    render(<VideoUpload tags={[]} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeVideoFile())
    await userEvent.click(screen.getByRole('button', { name: /upload sermon/i }))

    await waitFor(() => expect(screen.getByText(/failed to get upload url/i)).toBeInTheDocument())

    // Pick a new file — error should clear
    await userEvent.upload(input, makeVideoFile('new.mp4'))
    expect(screen.queryByText(/failed to get upload url/i)).not.toBeInTheDocument()
  })
})

describe('VideoUpload — tag selection', () => {
  it('renders tags when provided', () => {
    render(<VideoUpload tags={mockTags} />)
    expect(screen.getByText('Worship')).toBeInTheDocument()
    expect(screen.getByText('Prayer')).toBeInTheDocument()
  })

  it('toggles tag selection on click', async () => {
    render(<VideoUpload tags={mockTags} />)
    const worshipBtn = screen.getByText('Worship')

    // Click to select
    await userEvent.click(worshipBtn)
    expect(worshipBtn.closest('button')).toHaveClass('bg-emerald-700')

    // Click again to deselect
    await userEvent.click(worshipBtn)
    expect(worshipBtn.closest('button')).not.toHaveClass('bg-emerald-700')
  })

  it('does not render tag section when no tags are provided', () => {
    render(<VideoUpload tags={[]} />)
    expect(screen.queryByText('Tags')).not.toBeInTheDocument()
  })
})

describe('VideoUpload — upload errors', () => {
  it('shows error when presign fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) })

    render(<VideoUpload tags={[]} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeVideoFile())
    await userEvent.click(screen.getByRole('button', { name: /upload sermon/i }))

    await waitFor(() =>
      expect(screen.getByText(/failed to get upload url/i)).toBeInTheDocument()
    )
  })

  it('shows error when S3 upload fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ upload_url: 'https://s3.example.com', key: 'k', sermon_id: 1 }),
    })
    mockXHR(false)

    render(<VideoUpload tags={[]} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeVideoFile())
    await userEvent.click(screen.getByRole('button', { name: /upload sermon/i }))

    await waitFor(() =>
      expect(screen.getByText(/network error during upload/i)).toBeInTheDocument()
    )
  })

  it('shows error when complete fetch fails', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      // First call (presign) succeeds, second call (complete) fails
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ upload_url: 'https://s3.example.com', key: 'k', sermon_id: 1 }),
        })
      }
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    mockXHR(true)

    render(<VideoUpload tags={[]} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeVideoFile())
    await userEvent.click(screen.getByRole('button', { name: /upload sermon/i }))

    await waitFor(() =>
      expect(screen.getByText(/failed to finalize upload/i)).toBeInTheDocument()
    )
  })
})

describe('VideoUpload — success state', () => {
  it('shows success message after full upload', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ upload_url: 'https://s3.example.com', key: 'k', sermon_id: 1 }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    mockXHR(true)

    render(<VideoUpload tags={[]} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeVideoFile())
    await userEvent.click(screen.getByRole('button', { name: /upload sermon/i }))

    await waitFor(() =>
      expect(screen.getByText(/sermon uploaded successfully/i)).toBeInTheDocument()
    )
  })

  it('"Upload another" button resets form to idle', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ upload_url: 'https://s3.example.com', key: 'k', sermon_id: 1 }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    mockXHR(true)

    render(<VideoUpload tags={[]} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeVideoFile())
    await userEvent.click(screen.getByRole('button', { name: /upload sermon/i }))

    await waitFor(() => screen.getByText(/upload another/i))
    await userEvent.click(screen.getByText(/upload another/i))

    expect(screen.getByText(/click to select a video file/i)).toBeInTheDocument()
  })
})
