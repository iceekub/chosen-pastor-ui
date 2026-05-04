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

// Mock thumbnail server action
vi.mock('@/app/actions/storage', () => ({
  uploadVideoThumbnailAction: vi.fn().mockResolvedValue({ success: true }),
}))

function makeVideoFile(name = 'sermon.mp4', size = 1024 * 1024) {
  return new File(['x'.repeat(size)], name, { type: 'video/mp4' })
}

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
        if (succeed) this.onload?.()
        else this.onerror?.()
      }, 0)
    })
  }
  vi.stubGlobal('XMLHttpRequest', MockXHR)
}

function getFileInput() {
  return document.querySelector('input[type="file"]') as HTMLInputElement
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('VideoUpload — idle state', () => {
  it('renders drop zone', () => {
    render(<VideoUpload />)
    expect(screen.getByText(/drag & drop video files here/i)).toBeInTheDocument()
  })

  it('upload button not visible before any file is added', () => {
    render(<VideoUpload />)
    expect(screen.queryByRole('button', { name: /upload/i })).not.toBeInTheDocument()
  })
})

describe('VideoUpload — file selection', () => {
  it('auto-fills title from filename (without extension)', async () => {
    render(<VideoUpload />)
    await userEvent.upload(getFileInput(), makeVideoFile('easter-sunday.mp4'))
    expect(screen.getByDisplayValue('easter-sunday')).toBeInTheDocument()
  })

  it('shows filename after file is picked', async () => {
    render(<VideoUpload />)
    await userEvent.upload(getFileInput(), makeVideoFile('sermon.mp4'))
    expect(screen.getByText('sermon.mp4')).toBeInTheDocument()
  })

  it('upload button is disabled when title is empty', async () => {
    render(<VideoUpload />)
    await userEvent.upload(getFileInput(), makeVideoFile('video.mp4'))
    await userEvent.clear(screen.getByDisplayValue('video'))
    expect(screen.getByRole('button', { name: /^upload/i })).toBeDisabled()
  })

  it('accepts multiple files', async () => {
    render(<VideoUpload />)
    await userEvent.upload(getFileInput(), [makeVideoFile('a.mp4'), makeVideoFile('b.mp4')])
    expect(screen.getByText('a.mp4')).toBeInTheDocument()
    expect(screen.getByText('b.mp4')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload all 2/i })).toBeInTheDocument()
  })
})

describe('VideoUpload — upload errors', () => {
  it('shows error when presign fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) })

    render(<VideoUpload />)
    await userEvent.upload(getFileInput(), makeVideoFile())
    await userEvent.click(screen.getByRole('button', { name: /^upload/i }))

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
    await userEvent.upload(getFileInput(), makeVideoFile())
    await userEvent.click(screen.getByRole('button', { name: /^upload/i }))

    await waitFor(() =>
      expect(screen.getByText(/network error during upload/i)).toBeInTheDocument()
    )
  })
})

describe('VideoUpload — success state', () => {
  it('shows success state and "Upload more" after all files complete', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ presigned_upload_url: 'https://s3.example.com', video_id: 'abc', role: 'primary' }),
    })
    mockXHR(true)

    render(<VideoUpload />)
    await userEvent.upload(getFileInput(), makeVideoFile())
    await userEvent.click(screen.getByRole('button', { name: /^upload/i }))

    await waitFor(() =>
      expect(screen.getByText(/1 sermon uploaded/i)).toBeInTheDocument()
    )
    expect(screen.getByRole('button', { name: /upload more/i })).toBeInTheDocument()
  })

  it('"Upload more" resets to idle', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ presigned_upload_url: 'https://s3.example.com', video_id: 'abc' }),
    })
    mockXHR(true)

    render(<VideoUpload />)
    await userEvent.upload(getFileInput(), makeVideoFile())
    await userEvent.click(screen.getByRole('button', { name: /^upload/i }))

    await waitFor(() => screen.getByRole('button', { name: /upload more/i }))
    await userEvent.click(screen.getByRole('button', { name: /upload more/i }))

    expect(screen.getByText(/drag & drop video files here/i)).toBeInTheDocument()
  })
})
