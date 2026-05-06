/**
 * Tests for the thumbnail picker. Mocks the two server actions so
 * we can assert on what gets called with what; the actions
 * themselves are tested separately in __tests__/actions/storage.test.ts.
 */

vi.mock('@/app/actions/storage', () => ({
  pickAutoFrameAction: vi.fn(),
  uploadVideoThumbnailAction: vi.fn(),
}))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import { ThumbnailPicker } from '@/components/thumbnail-picker'
import {
  pickAutoFrameAction,
  uploadVideoThumbnailAction,
} from '@/app/actions/storage'
import { makeVideo } from '../factories'

const mockPick = vi.mocked(pickAutoFrameAction)
const mockUpload = vi.mocked(uploadVideoThumbnailAction)

const BASE = 'https://test-thumbnails.s3.us-west-2.amazonaws.com'

const KEYS = [
  'churches/c1/videos/v1/thumb_.0000001.jpg',
  'churches/c1/videos/v1/thumb_.0000002.jpg',
  'churches/c1/videos/v1/thumb_.0000003.jpg',
  'churches/c1/videos/v1/thumb_.0000004.jpg',
  'churches/c1/videos/v1/thumb_.0000005.jpg',
]
const URLS = KEYS.map((k) => `${BASE}/${k}`)

beforeEach(() => {
  mockPick.mockReset()
  mockUpload.mockReset()
})

describe('ThumbnailPicker — auto-frame candidates', () => {
  it('renders a button per thumbnail_key with a matching public URL', () => {
    const video = makeVideo({
      id: 'v1',
      thumbnail_keys: KEYS,
      thumbnail_url: URLS[2], // middle pick
    })
    render(<ThumbnailPicker video={video} />)

    const imgs = screen.getAllByAltText('Frame option') as HTMLImageElement[]
    expect(imgs.map((i) => i.src)).toEqual(URLS)
  })

  it('marks the candidate matching thumbnail_url as selected', () => {
    const video = makeVideo({
      id: 'v1',
      thumbnail_keys: KEYS,
      thumbnail_url: URLS[2],
    })
    render(<ThumbnailPicker video={video} />)

    // The selected candidate has aria-pressed=true; others have false.
    const buttons = screen.getAllByRole('button', { pressed: false })
    expect(buttons).toHaveLength(4)
    const selected = screen.getAllByRole('button', { pressed: true })
    expect(selected).toHaveLength(1)
    // And shows the "Selected" label inside.
    expect(screen.getByText('Selected')).toBeInTheDocument()
  })

  it('clicking a candidate calls pickAutoFrameAction with the right URL', async () => {
    mockPick.mockResolvedValue({ success: true, url: URLS[0] })
    const video = makeVideo({
      id: 'v1',
      thumbnail_keys: KEYS,
      thumbnail_url: URLS[2],
    })
    render(<ThumbnailPicker video={video} />)

    fireEvent.click(screen.getAllByAltText('Frame option')[0])

    await waitFor(() => {
      expect(mockPick).toHaveBeenCalledWith('v1', URLS[0])
    })
  })

  it('surfaces the action error when pickAutoFrameAction fails', async () => {
    mockPick.mockResolvedValue({ error: 'Backend down' })
    const video = makeVideo({ id: 'v1', thumbnail_keys: KEYS, thumbnail_url: URLS[2] })
    render(<ThumbnailPicker video={video} />)

    fireEvent.click(screen.getAllByAltText('Frame option')[0])
    await waitFor(() => {
      expect(screen.getByText('Backend down')).toBeInTheDocument()
    })
  })
})

describe('ThumbnailPicker — empty thumbnail_keys', () => {
  it('renders the upload affordance only', () => {
    const video = makeVideo({ id: 'v1', thumbnail_keys: [], thumbnail_url: null })
    render(<ThumbnailPicker video={video} />)

    expect(screen.queryByAltText('Frame option')).not.toBeInTheDocument()
    expect(screen.getByText(/no auto-generated frames/i)).toBeInTheDocument()
    // Upload link is still there.
    expect(screen.getByRole('button', { name: 'Upload your own' })).toBeInTheDocument()
  })
})

describe('ThumbnailPicker — custom upload preview', () => {
  it('shows a current-custom-thumbnail strip when thumbnail_url is not an auto-frame', () => {
    const customUrl = 'https://abc.supabase.co/storage/v1/object/public/video-thumbnails/c1/v1/thumbnail.jpg'
    const video = makeVideo({
      id: 'v1',
      thumbnail_keys: KEYS,
      thumbnail_url: customUrl,
    })
    render(<ThumbnailPicker video={video} />)

    const preview = screen.getByAltText('Current custom thumbnail') as HTMLImageElement
    expect(preview.src).toBe(customUrl)
    // None of the auto-frames are marked selected since the custom URL
    // doesn't match any candidate.
    expect(screen.queryByText('Selected')).not.toBeInTheDocument()
  })

  it('hides the custom-preview strip when thumbnail_url IS an auto-frame', () => {
    const video = makeVideo({
      id: 'v1',
      thumbnail_keys: KEYS,
      thumbnail_url: URLS[2],
    })
    render(<ThumbnailPicker video={video} />)
    expect(screen.queryByAltText('Current custom thumbnail')).not.toBeInTheDocument()
  })
})
