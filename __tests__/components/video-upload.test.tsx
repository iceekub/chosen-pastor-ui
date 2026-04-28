import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VideoUpload } from '@/components/video-upload'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

// Helper to create a fake video File
function makeVideoFile(name = 'sermon.mp4', size = 1024) {
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
        if (succeed) this.onload?.()
        else this.onerror?.()
      }, 0)
    })
  }
  vi.stubGlobal('XMLHttpRequest', MockXHR)
}

// Pick a file via the hidden file input
async function pickFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  await userEvent.upload(input, file)
}

// Fill the mandatory service date field for the first item card
function fillServiceDate(date = '2026-04-06') {
  const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
  fireEvent.change(dateInput, { target: { value: date } })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

// ─── Idle state ──────────────────────────────────────────────────────────────

describe('VideoUpload — idle state', () => {
  it('shows the drop zone prompt when no files selected', () => {
    render(<VideoUpload />)
    expect(screen.getByText(/drag.*drop.*click to select/i)).toBeInTheDocument()
  })

  it('upload button is not visible before any file is picked', () => {
    render(<VideoUpload />)
    expect(screen.queryByRole('button', { name: /upload/i })).not.toBeInTheDocument()
  })
})

// ─── File selection ───────────────────────────────────────────────────────────

describe('VideoUpload — file selection', () => {
  it('shows an item card after a file is picked', async () => {
    render(<VideoUpload />)
    await pickFile(makeVideoFile('sermon.mp4'))
    expect(screen.getByText('sermon.mp4')).toBeInTheDocument()
  })

  it('auto-fills the title from the filename (without extension)', async () => {
    render(<VideoUpload />)
    await pickFile(makeVideoFile('easter-sunday.mp4'))
    expect(screen.getByDisplayValue('easter-sunday')).toBeInTheDocument()
  })

  it('shows Title, Service date, and Pastor fields per card', async () => {
    render(<VideoUpload />)
    await pickFile(makeVideoFile())
    expect(screen.getByText(/^title$/i, { selector: 'label' })).toBeInTheDocument()
    expect(screen.getByText(/service date/i)).toBeInTheDocument()
    expect(screen.getByText(/pastor/i)).toBeInTheDocument()
  })

  it('upload button is disabled when service date is missing', async () => {
    render(<VideoUpload />)
    await pickFile(makeVideoFile())
    // Title is auto-filled but service date is empty
    expect(screen.getByRole('button', { name: /upload/i })).toBeDisabled()
  })

  it('upload button is enabled when title and service date are filled', async () => {
    render(<VideoUpload />)
    await pickFile(makeVideoFile())
    await fillServiceDate()
    expect(screen.getByRole('button', { name: /upload/i })).not.toBeDisabled()
  })

  it('allows picking up to 10 files', async () => {
    render(<VideoUpload />)
    const files = Array.from({ length: 10 }, (_, i) => makeVideoFile(`video${i}.mp4`))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, files)
    expect(screen.getByText(/maximum of 10 videos reached/i)).toBeInTheDocument()
  })

  it('removes a card when × is clicked', async () => {
    render(<VideoUpload />)
    await pickFile(makeVideoFile('sermon.mp4'))
    expect(screen.getByText('sermon.mp4')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /remove/i }))
    expect(screen.queryByText('sermon.mp4')).not.toBeInTheDocument()
  })
})

// ─── Upload errors ────────────────────────────────────────────────────────────

describe('VideoUpload — upload errors', () => {
  it('shows error when presign fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) })

    render(<VideoUpload />)
    await pickFile(makeVideoFile())
    await fillServiceDate()
    await userEvent.click(screen.getByRole('button', { name: /upload/i }))

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
    await pickFile(makeVideoFile())
    await fillServiceDate()
    await userEvent.click(screen.getByRole('button', { name: /upload/i }))

    await waitFor(() =>
      expect(screen.getByText(/network error during upload/i)).toBeInTheDocument()
    )
  })

  it('shows error when complete fetch fails', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ presigned_upload_url: 'https://s3.example.com', video_id: 'abc' }),
        })
      }
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    mockXHR(true)

    render(<VideoUpload />)
    await pickFile(makeVideoFile())
    await fillServiceDate()
    await userEvent.click(screen.getByRole('button', { name: /upload/i }))

    await waitFor(() =>
      expect(screen.getByText(/failed to finalize upload/i)).toBeInTheDocument()
    )
  })
})

// ─── Success state ────────────────────────────────────────────────────────────

describe('VideoUpload — success state', () => {
  it('shows per-card success state and summary after upload', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ presigned_upload_url: 'https://s3.example.com', video_id: 'abc' }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    mockXHR(true)

    render(<VideoUpload />)
    await pickFile(makeVideoFile())
    await fillServiceDate()
    await userEvent.click(screen.getByRole('button', { name: /upload/i }))

    await waitFor(() =>
      expect(screen.getAllByText(/uploaded — processing in the background/i).length).toBeGreaterThan(0)
    )
    expect(screen.getByText(/1 sermon uploaded/i)).toBeInTheDocument()
  })

  it('"Upload more" button resets back to the drop zone', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ presigned_upload_url: 'https://s3.example.com', video_id: 'abc' }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    mockXHR(true)

    render(<VideoUpload />)
    await pickFile(makeVideoFile())
    await fillServiceDate()
    await userEvent.click(screen.getByRole('button', { name: /upload/i }))

    await waitFor(() => screen.getByRole('button', { name: /upload more/i }))
    await userEvent.click(screen.getByRole('button', { name: /upload more/i }))

    expect(screen.getByText(/drag.*drop.*click to select/i)).toBeInTheDocument()
  })

  it('uploads multiple files in parallel and shows combined summary', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ presigned_upload_url: 'https://s3.example.com', video_id: 'a1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ presigned_upload_url: 'https://s3.example.com', video_id: 'a2' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    mockXHR(true)

    render(<VideoUpload />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, [makeVideoFile('a.mp4'), makeVideoFile('b.mp4')])

    // Fill both service dates
    const dateInputs = document.querySelectorAll('input[type="date"]')
    fireEvent.change(dateInputs[0], { target: { value: '2026-04-06' } })
    fireEvent.change(dateInputs[1], { target: { value: '2026-04-13' } })

    await userEvent.click(screen.getByRole('button', { name: /upload all 2/i }))

    await waitFor(() =>
      expect(screen.getByText(/2 sermons uploaded/i)).toBeInTheDocument()
    )
  })
})
