import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GardenContentEditor } from '@/components/garden-content-editor'
import type { Garden, GardenContent } from '@/lib/api/types'

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.restoreAllMocks())

function makeContent(overrides: Partial<GardenContent> = {}): GardenContent {
  return {
    day_number: 1,
    topic: 'Faith',
    title: 'Walking in Faith',
    push: 'Start your day with faith.',
    cards: [],
    final_reflection: {
      id: 'fr1',
      type: 'reflection_final',
      tag: 'FINAL',
      content: 'What will you trust God with today?',
      placeholder: 'Write your thoughts…',
    },
    ...overrides,
  }
}

function makeGarden(overrides: Partial<Garden> = {}): Garden {
  return {
    id: 'g1',
    video_id: 'v1',
    day_number: 1,
    status: 'ready',
    created_at: '2026-01-01',
    content_json: null,
    ...overrides,
  } as unknown as Garden
}

// ─── Empty state ──────────────────────────────────────────────────────────────

describe('GardenContentEditor — empty state', () => {
  it('shows empty state message when content_json is null', () => {
    render(<GardenContentEditor garden={makeGarden({ content_json: null })} />)
    expect(screen.getByText(/No content yet/i)).toBeInTheDocument()
  })
})

// ─── Header info ─────────────────────────────────────────────────────────────

describe('GardenContentEditor — header', () => {
  it('renders the garden title', () => {
    render(<GardenContentEditor garden={makeGarden({ content_json: makeContent() })} />)
    expect(screen.getByText('Walking in Faith')).toBeInTheDocument()
  })

  it('renders the push notification text', () => {
    render(<GardenContentEditor garden={makeGarden({ content_json: makeContent() })} />)
    expect(screen.getByText('Start your day with faith.')).toBeInTheDocument()
  })

  it('renders "Push notification" label', () => {
    render(<GardenContentEditor garden={makeGarden({ content_json: makeContent() })} />)
    expect(screen.getByText('Push notification')).toBeInTheDocument()
  })
})

// ─── Final reflection ─────────────────────────────────────────────────────────

describe('GardenContentEditor — final reflection', () => {
  it('renders the final reflection content', () => {
    render(<GardenContentEditor garden={makeGarden({ content_json: makeContent() })} />)
    expect(screen.getByText('What will you trust God with today?')).toBeInTheDocument()
  })

  it('renders the placeholder text', () => {
    render(<GardenContentEditor garden={makeGarden({ content_json: makeContent() })} />)
    expect(screen.getByText(/Write your thoughts/i)).toBeInTheDocument()
  })

  it('renders the Final Reflection label', () => {
    render(<GardenContentEditor garden={makeGarden({ content_json: makeContent() })} />)
    expect(screen.getByText('Final Reflection')).toBeInTheDocument()
  })
})

// ─── Cards label ─────────────────────────────────────────────────────────────

describe('GardenContentEditor — cards section', () => {
  it('renders the Cards section label', () => {
    render(<GardenContentEditor garden={makeGarden({ content_json: makeContent() })} />)
    expect(screen.getByText('Cards')).toBeInTheDocument()
  })
})

// ─── Verse card ──────────────────────────────────────────────────────────────

describe('GardenContentEditor — verse card', () => {
  it('renders verse content and citation', () => {
    const content = makeContent({
      cards: [
        {
          id: 'c1',
          type: 'verse',
          tag: 'VERSE',
          content: 'The Lord is my shepherd.',
          citation: 'Psalm 23:1',
          footerText: 'A psalm of David',
        },
      ],
    })
    render(<GardenContentEditor garden={makeGarden({ content_json: content })} />)
    expect(screen.getByText('The Lord is my shepherd.')).toBeInTheDocument()
    expect(screen.getByText('Psalm 23:1')).toBeInTheDocument()
    expect(screen.getByText('A psalm of David')).toBeInTheDocument()
  })

  it('renders VERSE tag in the card header', () => {
    const content = makeContent({
      cards: [{ id: 'c1', type: 'verse', tag: 'VERSE', content: 'Grace.' }],
    })
    render(<GardenContentEditor garden={makeGarden({ content_json: content })} />)
    expect(screen.getByText('VERSE')).toBeInTheDocument()
  })
})

// ─── Text card ───────────────────────────────────────────────────────────────

describe('GardenContentEditor — text card', () => {
  it('renders text card content', () => {
    const content = makeContent({
      cards: [{ id: 'c2', type: 'text', tag: 'DEVOTIONAL', content: 'God is good all the time.' }],
    })
    render(<GardenContentEditor garden={makeGarden({ content_json: content })} />)
    expect(screen.getByText('God is good all the time.')).toBeInTheDocument()
    expect(screen.getByText('DEVOTIONAL')).toBeInTheDocument()
  })
})

// ─── Reflection MC card ───────────────────────────────────────────────────────

describe('GardenContentEditor — reflection MC card', () => {
  it('renders question and all options', () => {
    const content = makeContent({
      cards: [
        {
          id: 'c3',
          type: 'reflection_mc',
          tag: 'REFLECT',
          content: 'How does this verse apply to you?',
          options: ['It gives me peace', 'It challenges me', 'It inspires prayer'],
        },
      ],
    })
    render(<GardenContentEditor garden={makeGarden({ content_json: content })} />)
    expect(screen.getByText('How does this verse apply to you?')).toBeInTheDocument()
    expect(screen.getByText('It gives me peace')).toBeInTheDocument()
    expect(screen.getByText('It challenges me')).toBeInTheDocument()
    expect(screen.getByText('It inspires prayer')).toBeInTheDocument()
  })
})

// ─── Media card ──────────────────────────────────────────────────────────────

describe('GardenContentEditor — media card', () => {
  it('renders media content and URL', () => {
    const content = makeContent({
      cards: [
        {
          id: 'c4',
          type: 'media',
          tag: 'MEDIA',
          content: 'Watch this clip',
          mediaUrl: 'https://example.com/video.mp4',
        },
      ],
    })
    render(<GardenContentEditor garden={makeGarden({ content_json: content })} />)
    expect(screen.getByText('Watch this clip')).toBeInTheDocument()
    expect(screen.getByText('https://example.com/video.mp4')).toBeInTheDocument()
  })
})

// ─── Multiple cards ───────────────────────────────────────────────────────────

describe('GardenContentEditor — multiple cards', () => {
  it('renders Card 1, Card 2, Card 3 labels for three cards', () => {
    const content = makeContent({
      cards: [
        { id: 'c1', type: 'text', tag: 'A', content: 'First' },
        { id: 'c2', type: 'text', tag: 'B', content: 'Second' },
        { id: 'c3', type: 'text', tag: 'C', content: 'Third' },
      ],
    })
    render(<GardenContentEditor garden={makeGarden({ content_json: content })} />)
    expect(screen.getByText('Card 1')).toBeInTheDocument()
    expect(screen.getByText('Card 2')).toBeInTheDocument()
    expect(screen.getByText('Card 3')).toBeInTheDocument()
  })

  it('renders content of all cards', () => {
    const content = makeContent({
      cards: [
        { id: 'c1', type: 'text', tag: 'A', content: 'Alpha content' },
        { id: 'c2', type: 'text', tag: 'B', content: 'Beta content' },
      ],
    })
    render(<GardenContentEditor garden={makeGarden({ content_json: content })} />)
    expect(screen.getByText('Alpha content')).toBeInTheDocument()
    expect(screen.getByText('Beta content')).toBeInTheDocument()
  })
})
