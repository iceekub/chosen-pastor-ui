import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GardenContentEditor } from '@/components/garden-content-editor'
import type { Garden } from '@/lib/api/types'

const mockFetch = vi.fn()
beforeEach(() => {
  mockFetch.mockReset()
  vi.stubGlobal('fetch', mockFetch)
})
afterEach(() => vi.unstubAllGlobals())

function makeGarden(overrides: Partial<Garden> = {}): Garden {
  return {
    id: 'g1',
    video_id: 'v1',
    day_number: 1,
    status: 'ready',
    created_at: '2026-01-01',
    content_markdown: '',
    ...overrides,
  }
}

describe('GardenContentEditor — empty state', () => {
  it('shows empty state message when no content', () => {
    render(<GardenContentEditor garden={makeGarden({ content_markdown: '' })} />)
    expect(screen.getByText(/No content yet/i)).toBeInTheDocument()
  })

  it('shows the Cards label', () => {
    render(<GardenContentEditor garden={makeGarden()} />)
    expect(screen.getByText('Cards')).toBeInTheDocument()
  })
})

describe('GardenContentEditor — section splitting', () => {
  it('renders one card per --- delimited section', () => {
    render(
      <GardenContentEditor
        garden={makeGarden({ content_markdown: 'Section A\n---\nSection B\n---\nSection C' })}
      />
    )
    expect(screen.getByText('Card 1')).toBeInTheDocument()
    expect(screen.getByText('Card 2')).toBeInTheDocument()
    expect(screen.getByText('Card 3')).toBeInTheDocument()
    expect(screen.getByText('Section A')).toBeInTheDocument()
    expect(screen.getByText('Section B')).toBeInTheDocument()
    expect(screen.getByText('Section C')).toBeInTheDocument()
  })

  it('renders a single card when there is no --- delimiter', () => {
    render(<GardenContentEditor garden={makeGarden({ content_markdown: 'Just one section' })} />)
    expect(screen.getByText('Card 1')).toBeInTheDocument()
    expect(screen.queryByText('Card 2')).not.toBeInTheDocument()
  })
})

describe('GardenContentEditor — inline card editing', () => {
  it('shows edit mode when Edit is clicked', () => {
    render(<GardenContentEditor garden={makeGarden({ content_markdown: 'Hello world' })} />)
    fireEvent.click(screen.getByText('Edit'))
    expect(screen.getByDisplayValue('Hello world')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('cancels edit mode without saving when Cancel is clicked', () => {
    render(<GardenContentEditor garden={makeGarden({ content_markdown: 'Hello world' })} />)
    fireEvent.click(screen.getByText('Edit'))
    fireEvent.change(screen.getByDisplayValue('Hello world'), { target: { value: 'Changed' } })
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByDisplayValue('Changed')).not.toBeInTheDocument()
    expect(screen.getByText('Hello world')).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('calls PUT /api/gardens/{id} with updated section on save', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) })

    render(<GardenContentEditor garden={makeGarden({ content_markdown: 'Old content' })} />)
    fireEvent.click(screen.getByText('Edit'))
    fireEvent.change(screen.getByDisplayValue('Old content'), { target: { value: 'New content' } })
    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/gardens/g1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ content_markdown: 'New content' }),
        }),
      )
    })
  })

  it('shows "Saved successfully" after save', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) })

    render(<GardenContentEditor garden={makeGarden({ content_markdown: 'Content' })} />)
    fireEvent.click(screen.getByText('Edit'))
    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(screen.getByText('Saved successfully')).toBeInTheDocument()
    })
  })

  it('shows error message when save fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    })

    render(<GardenContentEditor garden={makeGarden({ content_markdown: 'Content' })} />)
    fireEvent.click(screen.getByText('Edit'))
    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument()
    })
  })
})

describe('GardenContentEditor — add and remove cards', () => {
  it('adds a new empty card in edit mode when "+ Add card" is clicked', () => {
    render(<GardenContentEditor garden={makeGarden({ content_markdown: 'Existing' })} />)
    fireEvent.click(screen.getByText('+ Add card'))
    expect(screen.getByText('Card 2')).toBeInTheDocument()
    // New card is in edit mode — textarea is present
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
  })

  it('removes a card and calls PUT on remove', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) })

    render(
      <GardenContentEditor
        garden={makeGarden({ content_markdown: 'Card A\n---\nCard B' })}
      />
    )
    const removeButtons = screen.getAllByText('Remove')
    fireEvent.click(removeButtons[0])

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/gardens/g1',
        expect.objectContaining({ method: 'PUT' }),
      )
    })
    expect(screen.queryByText('Card 2')).not.toBeInTheDocument()
  })
})

describe('GardenContentEditor — full content editing', () => {
  it('toggles to full-content edit mode when "Edit full" is clicked', () => {
    render(<GardenContentEditor garden={makeGarden({ content_markdown: 'Hello' })} />)
    fireEvent.click(screen.getByText('Edit full'))
    expect(screen.getByPlaceholderText(/Separate cards with ---/i)).toBeInTheDocument()
    expect(screen.getByText('Card view')).toBeInTheDocument()
  })

  it('returns to card view when "Card view" is clicked', () => {
    render(<GardenContentEditor garden={makeGarden({ content_markdown: 'Hello' })} />)
    fireEvent.click(screen.getByText('Edit full'))
    fireEvent.click(screen.getByText('Card view'))
    expect(screen.queryByPlaceholderText(/Separate cards with ---/i)).not.toBeInTheDocument()
  })

  it('calls PUT with full content on save', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) })

    render(<GardenContentEditor garden={makeGarden({ content_markdown: 'Original' })} />)
    fireEvent.click(screen.getByText('Edit full'))
    const textarea = screen.getByPlaceholderText(/Separate cards with ---/i)
    fireEvent.change(textarea, { target: { value: 'New\n---\nContent' } })
    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/gardens/g1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ content_markdown: 'New\n---\nContent' }),
        }),
      )
    })
  })

  it('cancels full edit without saving', () => {
    render(<GardenContentEditor garden={makeGarden({ content_markdown: 'Original' })} />)
    fireEvent.click(screen.getByText('Edit full'))
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByPlaceholderText(/Separate cards with ---/i)).not.toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
