import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GardenContentEditor } from '@/components/garden-content-editor'
import { makeGarden, makeGardenContent } from '../factories'
import type { GardenCard, GardenContent } from '@/lib/api/types'

const mockFetch = vi.fn()
beforeEach(() => {
  mockFetch.mockReset()
  vi.stubGlobal('fetch', mockFetch)
  vi.clearAllMocks()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ─── Empty state ──────────────────────────────────────────────────────────────

describe('GardenContentEditor — empty state', () => {
  it('shows empty state message when content_json is null', () => {
    render(<GardenContentEditor garden={makeGarden({ content_json: null })} />)
    expect(screen.getByText(/No content yet/i)).toBeInTheDocument()
  })

  it('shows empty-state message when there are no cards', () => {
    const empty = makeGarden({ content_json: makeGardenContent({ cards: [] }) })
    render(<GardenContentEditor garden={empty} />)
    expect(screen.getByText(/No cards yet/i)).toBeInTheDocument()
  })
})

// ─── Header info ─────────────────────────────────────────────────────────────

describe('GardenContentEditor — header', () => {
  it('renders the garden title', () => {
    const content = makeGardenContent({ title: 'Walking in Faith' })
    render(<GardenContentEditor garden={makeGarden({ content_json: content })} />)
    expect(screen.getByText('Walking in Faith')).toBeInTheDocument()
  })

  it('renders the push notification text', () => {
    const content = makeGardenContent({ push: 'Start your day with faith.' })
    render(<GardenContentEditor garden={makeGarden({ content_json: content })} />)
    expect(screen.getByText('Start your day with faith.')).toBeInTheDocument()
  })

  it('renders "Push notification" label when push is set', () => {
    const content = makeGardenContent({ push: 'A message' })
    render(<GardenContentEditor garden={makeGarden({ content_json: content })} />)
    expect(screen.getByText('Push notification')).toBeInTheDocument()
  })
})

// ─── Cards section ────────────────────────────────────────────────────────────

describe('GardenContentEditor — cards section', () => {
  it('renders the Cards section label', () => {
    render(<GardenContentEditor garden={makeGarden({ content_json: makeGardenContent() })} />)
    expect(screen.getByText('Cards')).toBeInTheDocument()
  })

  it('renders one row per card with the card type label', () => {
    const cards: GardenCard[] = [
      { id: 'a', type: 'verse', tag: 'Scripture', citation: 'John 3:16', content: 'For God so loved...' },
      { id: 'b', type: 'text', tag: 'Application', content: 'Take a step today.' },
    ]
    render(<GardenContentEditor garden={makeGarden({ content_json: makeGardenContent({ cards }) })} />)
    expect(screen.getByText('Verse — John 3:16')).toBeInTheDocument()
    expect(screen.getByText('Application')).toBeInTheDocument()
    expect(screen.getByText('For God so loved...')).toBeInTheDocument()
    expect(screen.getByText('Take a step today.')).toBeInTheDocument()
  })

  it('renders Card 1, Card 2, Card 3 labels for three cards', () => {
    const cards: GardenCard[] = [
      { id: 'c1', type: 'text', tag: 'A', content: 'First' },
      { id: 'c2', type: 'text', tag: 'B', content: 'Second' },
      { id: 'c3', type: 'text', tag: 'C', content: 'Third' },
    ]
    render(<GardenContentEditor garden={makeGarden({ content_json: makeGardenContent({ cards }) })} />)
    expect(screen.getByText('Card 1')).toBeInTheDocument()
    expect(screen.getByText('Card 2')).toBeInTheDocument()
    expect(screen.getByText('Card 3')).toBeInTheDocument()
  })

  it('renders content of all cards', () => {
    const cards: GardenCard[] = [
      { id: 'c1', type: 'text', tag: 'A', content: 'Alpha content' },
      { id: 'c2', type: 'text', tag: 'B', content: 'Beta content' },
    ]
    render(<GardenContentEditor garden={makeGarden({ content_json: makeGardenContent({ cards }) })} />)
    expect(screen.getByText('Alpha content')).toBeInTheDocument()
    expect(screen.getByText('Beta content')).toBeInTheDocument()
  })
})

// ─── Verse card ──────────────────────────────────────────────────────────────

describe('GardenContentEditor — verse card', () => {
  it('renders verse content and citation', () => {
    const cards: GardenCard[] = [
      {
        id: 'c1',
        type: 'verse',
        tag: 'VERSE',
        content: 'The Lord is my shepherd.',
        citation: 'Psalm 23:1',
        footerText: 'A psalm of David',
      },
    ]
    render(<GardenContentEditor garden={makeGarden({ content_json: makeGardenContent({ cards }) })} />)
    expect(screen.getByText('The Lord is my shepherd.')).toBeInTheDocument()
    expect(screen.getByText('Psalm 23:1')).toBeInTheDocument()
  })
})

// ─── Reflection MC card ───────────────────────────────────────────────────────

describe('GardenContentEditor — reflection MC card', () => {
  it('renders question and all options', () => {
    const cards: GardenCard[] = [
      {
        id: 'c3',
        type: 'reflection_mc',
        tag: 'REFLECT',
        content: 'How does this verse apply to you?',
        options: ['It gives me peace', 'It challenges me', 'It inspires prayer'],
      },
    ]
    render(<GardenContentEditor garden={makeGarden({ content_json: makeGardenContent({ cards }) })} />)
    expect(screen.getByText('How does this verse apply to you?')).toBeInTheDocument()
    expect(screen.getByText('It gives me peace')).toBeInTheDocument()
  })
})

// ─── Editing ──────────────────────────────────────────────────────────────────

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
      { id: 'a', type: 'text', tag: 'A', content: 'A' },
      { id: 'b', type: 'text', tag: 'B', content: 'B' },
    ]
    render(<GardenContentEditor garden={makeGarden({ content_json: makeGardenContent({ cards }) })} />)

    fireEvent.click(screen.getAllByText('Remove')[0])

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.content_json.cards).toHaveLength(1)
    expect(body.content_json.cards[0].id).toBe('b')
  })
})

// ─── Final reflection ─────────────────────────────────────────────────────────

describe('GardenContentEditor — final reflection', () => {
  it('renders the final reflection content', () => {
    const content = makeGardenContent({
      final_reflection: {
        id: 'fr1',
        type: 'reflection_final',
        tag: 'FINAL',
        content: 'What will you trust God with today?',
        placeholder: 'Write your thoughts…',
      },
    } as Partial<GardenContent>)
    render(<GardenContentEditor garden={makeGarden({ content_json: content })} />)
    expect(screen.getByText('What will you trust God with today?')).toBeInTheDocument()
  })

  it('renders the Final Reflection label', () => {
    render(<GardenContentEditor garden={makeGarden({ content_json: makeGardenContent() })} />)
    expect(screen.getByText('Final Reflection')).toBeInTheDocument()
  })
})
