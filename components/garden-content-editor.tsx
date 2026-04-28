'use client'

import { useState } from 'react'
import type { Garden, GardenCard, GardenContent, ReflectionFinalCard } from '@/lib/api/types'

interface Props {
  garden: Garden
}

function emptyContent(garden: Garden): GardenContent {
  return {
    day_number: garden.day_number,
    topic: garden.topic,
    title: garden.topic,
    push: '',
    cards: [],
    final_reflection: {
      id: 'fr0',
      type: 'reflection_final',
      tag: 'FINAL',
      content: '',
    },
  }
}

function newTextCard(): GardenCard {
  return {
    id: `c${Math.random().toString(36).slice(2, 8)}`,
    type: 'text',
    tag: 'Reflection',
    content: '',
  }
}

function cardLabel(card: GardenCard): string {
  switch (card.type) {
    case 'verse':
      return card.citation ? `Verse — ${card.citation}` : 'Verse'
    case 'text':
      return card.tag ?? 'Text'
    case 'reflection_mc':
      return 'Multiple choice'
    case 'media':
      return 'Media'
  }
}

// ─── Card renderers ───────────────────────────────────────────────────────────

function CardShell({ index, tag, children }: { index: number; tag: string; children: React.ReactNode }) {
  return (
    <div className="surface overflow-hidden anim-fadeUp" style={{ animationDelay: `${index * 0.05}s` }}>
      <div
        className="flex items-center justify-between px-5 py-2.5"
        style={{ background: 'rgba(230,218,200,0.3)', borderBottom: '1px solid #EAD9C4' }}
      >
        <span className="section-label" style={{ color: '#C5B49A' }}>Card {index + 1}</span>
        <span className="text-xs font-semibold" style={{ color: '#C5B49A', fontFamily: 'var(--font-mulish)', letterSpacing: '0.04em' }}>
          {tag}
        </span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function FinalReflectionView({ card }: { card: ReflectionFinalCard }) {
  return (
    <div className="surface overflow-hidden anim-fadeUp">
      <div
        className="flex items-center justify-between px-5 py-2.5"
        style={{ background: 'rgba(90,138,106,0.08)', borderBottom: '1px solid rgba(90,138,106,0.15)' }}
      >
        <span className="section-label" style={{ color: '#5A8A6A' }}>Final Reflection</span>
        <span className="text-xs font-semibold" style={{ color: '#5A8A6A', fontFamily: 'var(--font-mulish)', letterSpacing: '0.04em' }}>
          {card.tag}
        </span>
      </div>
      <div className="px-5 py-4">
        <p className="text-sm font-semibold mb-1" style={{ color: '#2C1E0F', fontFamily: 'var(--font-mulish)' }}>
          {card.content}
        </p>
        {card.placeholder && (
          <p className="text-xs" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)', fontStyle: 'italic' }}>
            Placeholder: {card.placeholder}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GardenContentEditor({ garden }: Props) {
  const [content, setContent] = useState<GardenContent>(
    garden.content_json ?? emptyContent(garden),
  )
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  if (!garden.content_json) {
    return (
      <div className="surface px-8 py-12 text-center" style={{ borderStyle: 'dashed' }}>
        <p className="text-sm" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
          No content yet — gardens are still being generated.
        </p>
      </div>
    )
  }

  async function persist(next: GardenContent) {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(`/api/gardens/${garden.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_json: next }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function saveCard(index: number) {
    const next: GardenContent = {
      ...content,
      cards: content.cards.map((c, i) =>
        i === index ? ({ ...c, content: editText } as GardenCard) : c,
      ),
    }
    setContent(next)
    setEditingIndex(null)
    await persist(next)
  }

  async function addCard() {
    const next: GardenContent = { ...content, cards: [...content.cards, newTextCard()] }
    setContent(next)
    setEditingIndex(next.cards.length - 1)
    setEditText('')
    await persist(next)
  }

  async function removeCard(index: number) {
    const next: GardenContent = {
      ...content,
      cards: content.cards.filter((_, i) => i !== index),
    }
    setContent(next)
    await persist(next)
  }

  return (
    <div>
      {/* Garden header info */}
      <div className="surface px-6 py-5 mb-4 anim-fadeUp">
        <p className="section-label mb-1">Title</p>
        <p className="text-base font-semibold" style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}>
          {content.title}
        </p>
        {content.push && (
          <>
            <p className="section-label mt-4 mb-1">Push notification</p>
            <p className="text-sm" style={{ fontFamily: 'var(--font-mulish)', color: '#8A7060' }}>
              {content.push}
            </p>
          </>
        )}
      </div>

      {/* Editable cards */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <p className="section-label">Cards</p>
          <button
            onClick={addCard}
            className="text-xs font-semibold transition-colors"
            style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}
          >
            + Add card
          </button>
        </div>

        {content.cards.length === 0 && (
          <div className="surface px-8 py-12 text-center" style={{ borderStyle: 'dashed' }}>
            <p className="text-sm" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
              No cards yet. Add one to get started.
            </p>
          </div>
        )}

        {content.cards.map((card, index) => (
          <div
            key={card.id ?? index}
            className="surface overflow-hidden anim-fadeUp"
            style={{ animationDelay: `${index * 0.06}s` }}
          >
            <div
              className="flex items-center justify-between px-5 py-2.5"
              style={{ background: 'rgba(230,218,200,0.3)', borderBottom: '1px solid #EAD9C4' }}
            >
              <span className="section-label" style={{ color: '#C5B49A' }}>
                {cardLabel(card)}
              </span>
              <div className="flex gap-3">
                {editingIndex !== index && (
                  <>
                    <button
                      onClick={() => {
                        setEditingIndex(index)
                        setEditText(
                          'content' in card && typeof card.content === 'string'
                            ? card.content
                            : '',
                        )
                      }}
                      className="text-xs font-semibold transition-colors"
                      style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeCard(index)}
                      className="text-xs font-semibold transition-colors"
                      style={{ color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="px-5 py-4">
              {editingIndex === index ? (
                <div className="space-y-3">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={4}
                    className="input-warm resize-y w-full"
                    style={{ fontFamily: 'var(--font-mulish)' }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveCard(index)}
                      disabled={saving}
                      className="btn-gold text-xs px-4 py-2"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingIndex(null)}
                      className="text-xs font-medium px-4 py-2 rounded-full transition-colors"
                      style={{
                        color: '#8A7060',
                        background: 'rgba(138,112,96,0.08)',
                        fontFamily: 'var(--font-mulish)',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{
                    fontFamily: 'var(--font-mulish)',
                    color:
                      'content' in card && card.content ? '#2C1E0F' : '#C5B49A',
                    fontStyle:
                      'content' in card && card.content ? 'normal' : 'italic',
                  }}
                >
                  {('content' in card && card.content) || 'No content'}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Final reflection (read-only display) */}
      {content.final_reflection && (
        <FinalReflectionView card={content.final_reflection} />
      )}

      {/* Status feedback */}
      {error && (
        <p className="text-sm mt-3" style={{ color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}>
          {error}
        </p>
      )}
      {saved && (
        <p className="text-sm mt-3" style={{ color: '#5A8A6A', fontFamily: 'var(--font-mulish)' }}>
          Saved successfully
        </p>
      )}
    </div>
  )
}
