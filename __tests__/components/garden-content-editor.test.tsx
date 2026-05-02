import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GardenContentEditor } from '@/components/garden-content-editor'
import { makeGarden, makeGardenContent } from '../factories'
import type { GardenCard } from '@/lib/api/types'

const mockFetch = vi.fn()
beforeEach(() => {
  mockFetch.mockReset()
  vi.stubGlobal('fetch', mockFetch)
})
afterEach(() => vi.unstubAllGlobals())

describe('GardenContentEditor — empty state', () => {
  it('shows empty-state message when there are no cards', () => {
    const empty = makeGarden({ content_json: makeGardenContent({ cards: [] }) })
    render(<GardenContentEditor garden={empty} />)
    expect(screen.getByText(/No cards yet/i)).toBeInTheDocument()
    expect(screen.getByText('Cards')).toBeInTheDocument()
  })
})

describe('GardenContentEditor — rendering', () => {
  it('renders one row per card with the card type label', () => {
    const cards: GardenCard[] = [
      { id: 'a', type: 'verse', citation: 'John 3:16', content: 'For God so loved...' },
      { id: 'b', type: 'text', tag: 'Application', content: 'Take a step today.' },
    ]
    render(<GardenContentEditor garden={makeGarden({ content_json: makeGardenContent({ cards }) })} />)
    expect(screen.getByText('Verse — John 3:16')).toBeInTheDocument()
    // tag field is overridden by CANONICAL_TAG; 'text' type always displays as 'Thought for Today'
    expect(screen.getByText('Thought for Today')).toBeInTheDocument()
    expect(screen.getByText('For God so loved...')).toBeInTheDocument()
    expect(screen.getByText('Take a step today.')).toBeInTheDocument()
  })
})

describe('GardenContentEditor — editing', () => {
  it('saves edited card content via PUT /api/gardens/:id', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) })
    const cards: GardenCard[] = [
      { id: 'a', type: 'text', tag: 'Reflection', content: 'Original' },
    ]
    render(<GardenContentEditor garden={makeGarden({ content_json: makeGardenContent({ cards }) })} />)

    fireEvent.click(screen.getAllByText('Edit')[0])
    const textarea = screen.getByDisplayValue('Original') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'Edited copy' } })
    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/gardens/g1')
    expect(init.method).toBe('PUT')
    const body = JSON.parse(init.body)
    expect(body.content_json.cards[0].content).toBe('Edited copy')
    expect(body.content_json.cards[0].type).toBe('text') // type preserved
  })

  it('removes a card and persists the updated array', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) })
    const cards: GardenCard[] = [
      { id: 'a', type: 'text', content: 'A' },
      { id: 'b', type: 'text', content: 'B' },
    ]
    render(<GardenContentEditor garden={makeGarden({ content_json: makeGardenContent({ cards }) })} />)

    fireEvent.click(screen.getAllByText('Remove')[0])

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.content_json.cards).toHaveLength(1)
    expect(body.content_json.cards[0].id).toBe('b')
  })
})
