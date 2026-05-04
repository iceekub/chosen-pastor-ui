import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VideoUpload } from '@/components/video-upload'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

// Helper to create a fake video File
function makeVideoFile(name = 'sermon.mp4', size = 1024 * 1024) {
  return new File(['x'.repeat(size)], name, { type: 'video/mp4' })
}

// Stub XMLHttpRequest so S3 uploads resolve/reject immediately
function mockXHR(succeed = true) {
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
    render(<VideoUpload />)
    expect(screen.getByText(/click to select a video file/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/sunday sermon/i)).toBeInTheDocument()
  })

  it('submit button is disabled when no file is selected', () => {
    render(<VideoUpload />)
    expect(screen.getByRole('button', { name: /upload sermon/i })).toBeDisabled()
  })

  it('submit button is disabled when title is empty even with a file', async () => {
    render(<VideoUpload />)
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
    render(<VideoUpload />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeVideoFile('easter-sunday.mp4'))
    expect(screen.getByDisplayValue('easter-sunday')).toBeInTheDocument()
  })

  it('shows filename and size after file is picked', async () => {
    render(<VideoUpload />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeVideoFile('sermon.mp4'))
    expect(screen.getByText('sermon.mp4')).toBeInTheDocument()
  })

  it('clears any previous error when a new file is selected', async () => {
    mockXHR(false)
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Upload rejected' }),
    })

    render(<VideoUpload />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeVideoFile())
    await userEvent.click(screen.getByRole('button', { name: /upload sermon/i }))

    await waitFor(() => expect(screen.getByText(/upload rejected/i)).toBeInTheDocument())

    // Pick a new file — error should clear
    await userEvent.upload(input, makeVideoFile('new.mp4'))
    expect(screen.queryByText(/upload rejected/i)).not.toBeInTheDocument()
  })
})

describe('VideoUpload — upload errors', () => {
  it('shows error when presign fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) })

    render(<VideoUpload />)
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
      json: async () => ({ presigned_upload_url: 'https://s3.example.com', video_id: 'abc' }),
    })
    mockXHR(false)

    render(<VideoUpload />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeVideoFile())
    await userEvent.click(screen.getByRole('button', { name: /upload sermon/i }))

    await waitFor(() =>
      expect(screen.getByText(/network error during upload/i)).toBeInTheDocument()
    )
  })

})

describe('VideoUpload — success state', () => {
  it('shows success message after full upload', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ presigned_upload_url: 'https://s3.example.com', video_id: 'abc' }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    mockXHR(true)

    render(<VideoUpload />)
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
        json: async () => ({ presigned_upload_url: 'https://s3.example.com', video_id: 'abc' }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    mockXHR(true)

    render(<VideoUpload />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeVideoFile())
    await userEvent.click(screen.getByRole('button', { name: /upload sermon/i }))

    await waitFor(() => screen.getByText(/upload another/i))
    await userEvent.click(screen.getByText(/upload another/i))

    expect(screen.getByText(/click to select a video file/i)).toBeInTheDocument()
  })
})
