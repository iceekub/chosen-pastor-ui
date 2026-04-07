'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Garden, Card, CardType } from '@/lib/api/types'

const CARD_TYPE_LABEL: Record<CardType, string> = {
  1: 'Text', 2: 'Image', 3: 'Video', 4: 'Question',
}

export function GardenCardEditor({ garden }: { garden: Garden }) {
  const router = useRouter()
  const [cards, setCards] = useState<Card[]>(
    [...(garden.cards ?? [])].sort((a, b) => a.position - b.position)
  )
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function saveCard(card: Card) {
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/garden/${garden.id}/card/${card.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editContent }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setCards((prev) => prev.map((c) => c.id === card.id ? { ...c, content: editContent } : c))
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function approveGarden() {
    setApproving(true); setError(null)
    try {
      const res = await fetch(`/api/garden/${garden.id}/approve`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to approve')
      router.push('/garden')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed')
      setApproving(false)
    }
  }

  return (
    <div>
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm mb-5" style={{ background: 'rgba(200,80,60,0.08)', border: '1px solid rgba(200,80,60,0.2)', color: '#A03020', fontFamily: 'var(--font-mulish)' }}>
          {error}
        </div>
      )}

      <div className="space-y-3 mb-6">
        {cards.length === 0 && (
          <div className="surface px-8 py-12 text-center" style={{ borderStyle: 'dashed' }}>
            <p className="text-sm" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>No cards in this Garden yet.</p>
          </div>
        )}

        {cards.map((card, index) => (
          <div
            key={card.id}
            className="surface overflow-hidden anim-fadeUp"
            style={{ animationDelay: `${index * 0.06}s` }}
          >
            {/* Card header */}
            <div
              className="flex items-center justify-between px-5 py-2.5"
              style={{ background: 'rgba(230,218,200,0.3)', borderBottom: '1px solid #EAD9C4' }}
            >
              <div className="flex items-center gap-2">
                <span className="section-label" style={{ color: '#C5B49A' }}>Card {index + 1}</span>
                <span
                  className="text-xs font-medium rounded-full px-2 py-0.5"
                  style={{ background: 'rgba(184,135,74,0.1)', color: '#B8874A', fontFamily: 'var(--font-mulish)' }}
                >
                  {CARD_TYPE_LABEL[card.card_type]}
                </span>
              </div>
              {editingId !== card.id && (
                <button
                  onClick={() => { setEditingId(card.id); setEditContent(card.content) }}
                  className="text-xs font-semibold transition-colors"
                  style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}
                >
                  Edit
                </button>
              )}
            </div>

            {/* Card body */}
            <div className="px-5 py-4">
              {editingId === card.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                    className="input-warm resize-y"
                    style={{ fontFamily: 'var(--font-mulish)' }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveCard(card)}
                      disabled={saving}
                      className="btn-gold text-xs px-4 py-2"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs font-medium px-4 py-2 rounded-full transition-colors"
                      style={{ color: '#8A7060', background: 'rgba(138,112,96,0.08)', fontFamily: 'var(--font-mulish)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F', fontStyle: card.content ? 'normal' : 'italic' }}
                >
                  {card.content || <span style={{ color: '#C5B49A' }}>No content</span>}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Approve */}
      {garden.status !== 'live' && (
        <div
          className="surface flex items-center justify-between px-6 py-5 anim-fadeUp"
          style={{ animationDelay: `${cards.length * 0.06 + 0.1}s`, borderColor: 'rgba(184,135,74,0.25)' }}
        >
          <div>
            <p className="text-sm font-semibold mb-0.5" style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}>
              Ready to publish?
            </p>
            <p className="text-xs" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
              Approving schedules this Garden to go live as planned.
            </p>
          </div>
          <button
            onClick={approveGarden}
            disabled={approving}
            className="btn-gold shrink-0 px-5 py-2.5 text-sm"
          >
            {approving ? 'Approving…' : 'Approve Garden →'}
          </button>
        </div>
      )}
    </div>
  )
}
