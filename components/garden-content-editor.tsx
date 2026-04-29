'use client'

import { useState } from 'react'
import type {
  Garden,
  GardenCard,
  GardenContent,
  QuestionGardenCard,
  ReflectionFinalGardenCard,
  TextGardenCard,
  VerseGardenCard,
} from '@/lib/api/types'

interface Props {
  garden: Garden
}

/* ─── helpers ─────────────────────────────────────────────── */

function emptyContent(garden: Garden): GardenContent {
  return { day_number: garden.day_number, topic: garden.topic, cards: [] }
}

function normalizeContent(garden: Garden): GardenContent {
  const raw = garden.content_json
  if (!raw) return emptyContent(garden)
  if (Array.isArray(raw)) {
    return { day_number: garden.day_number, topic: garden.topic, cards: raw as GardenCard[] }
  }
  return { ...raw, cards: raw.cards ?? [] }
}

type EditableCardType = Exclude<GardenCard['type'], 'media'>
type AddableCardType = 'verse' | 'text' | 'reflection_mc'

function newCard(type: AddableCardType): GardenCard {
  const id = `c${Math.random().toString(36).slice(2, 8)}`
  switch (type) {
    case 'verse':
      return { id, type: 'verse', tag: 'Verse', content: '', citation: '', footerText: '' }
    case 'text':
      return { id, type: 'text', tag: 'Thought for Today', content: '' }
    case 'reflection_mc':
      return { id, type: 'reflection_mc', tag: 'Multiple Choice', content: '', options: ['', ''] }
  }
}

function cardLabel(card: GardenCard): string {
  switch (card.type) {
    case 'verse':      return card.citation ? `Verse — ${card.citation}` : 'Verse'
    case 'text':       return card.tag ?? 'Text'
    case 'reflection_mc':    return 'Multiple choice'
    case 'reflection_final': return 'Final reflection'
    case 'media':      return 'Media'
  }
}

/* ─── shared input styles ─────────────────────────────────── */

const inputStyle: React.CSSProperties = { fontFamily: 'var(--font-mulish)' }
const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mulish)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#A09080',
  marginBottom: 4,
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p style={labelStyle}>{label}</p>
      {children}
    </div>
  )
}


/* ─── type-specific edit forms ────────────────────────────── */

function VerseEdit({ card, onChange }: { card: VerseGardenCard; onChange: (c: VerseGardenCard) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Citation (e.g. John 3:16 · NIV)">
        <input className="input-warm w-full" style={inputStyle} value={card.citation ?? ''} onChange={e => onChange({ ...card, citation: e.target.value })} />
      </Field>
      <Field label="Verse text">
        <textarea className="input-warm resize-y w-full" style={inputStyle} rows={3} value={card.content} onChange={e => onChange({ ...card, content: e.target.value })} />
      </Field>
      <Field label="Footer / reflection note">
        <textarea className="input-warm resize-y w-full" style={inputStyle} rows={2} value={card.footerText ?? ''} onChange={e => onChange({ ...card, footerText: e.target.value })} />
      </Field>
    </div>
  )
}

function TextEdit({ card, onChange }: { card: TextGardenCard; onChange: (c: TextGardenCard) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Content">
        <textarea className="input-warm resize-y w-full" style={inputStyle} rows={4} value={card.content} onChange={e => onChange({ ...card, content: e.target.value })} />
      </Field>
    </div>
  )
}

function MCEdit({ card, onChange }: { card: QuestionGardenCard; onChange: (c: QuestionGardenCard) => void }) {
  const atMax = card.options.length >= 4

  function setOption(i: number, val: string) {
    onChange({ ...card, options: card.options.map((o, idx) => (idx === i ? val : o)) })
  }
  function addOption() {
    if (atMax) return
    onChange({ ...card, options: [...card.options, ''] })
  }
  function removeOption(i: number) {
    if (card.options.length <= 2) return
    onChange({ ...card, options: card.options.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="space-y-3">
      <Field label="Question">
        <textarea className="input-warm resize-y w-full" style={inputStyle} rows={3} value={card.content} onChange={e => onChange({ ...card, content: e.target.value })} />
      </Field>
      <Field label="Answer options (max 4)">
        <div className="space-y-2">
          {card.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span style={{ fontFamily: 'var(--font-mulish)', fontSize: 12, color: '#C5B49A', minWidth: 18 }}>{i + 1}.</span>
              <input
                className="input-warm flex-1"
                style={inputStyle}
                value={opt}
                onChange={e => setOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
              />
              <button
                onClick={() => removeOption(i)}
                disabled={card.options.length <= 2}
                className="text-xs font-semibold transition-colors disabled:opacity-30"
                style={{ color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}
              >
                ✕
              </button>
            </div>
          ))}
          {!atMax && (
            <button
              onClick={addOption}
              className="text-xs font-semibold transition-colors mt-1"
              style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}
            >
              + Add option
            </button>
          )}
        </div>
      </Field>
    </div>
  )
}

function FinalEdit({ card, onChange }: { card: ReflectionFinalGardenCard; onChange: (c: ReflectionFinalGardenCard) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Prompt">
        <textarea className="input-warm resize-y w-full" style={inputStyle} rows={3} value={card.content} onChange={e => onChange({ ...card, content: e.target.value })} />
      </Field>
    </div>
  )
}

function CardEditForm({ card, onChange }: { card: GardenCard; onChange: (c: GardenCard) => void }) {
  switch (card.type) {
    case 'verse':            return <VerseEdit card={card} onChange={onChange} />
    case 'text':             return <TextEdit card={card} onChange={onChange} />
    case 'reflection_mc':    return <MCEdit card={card} onChange={onChange} />
    case 'reflection_final': return <FinalEdit card={card} onChange={onChange} />
    case 'media':            return <p className="text-sm" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>Media cards are not editable here.</p>
  }
}

/* ─── card preview (read mode) ────────────────────────────── */

function CardPreview({ card }: { card: GardenCard }) {
  const textCls = 'text-sm leading-relaxed'
  const mutedStyle: React.CSSProperties = { color: '#C5B49A', fontStyle: 'italic', fontFamily: 'var(--font-mulish)' }
  const bodyStyle: React.CSSProperties = { color: '#2C1E0F', fontFamily: 'var(--font-mulish)' }
  const metaStyle: React.CSSProperties = { color: '#A09080', fontFamily: 'var(--font-mulish)', fontSize: 12 }

  switch (card.type) {
    case 'verse':
      return (
        <div className="space-y-1.5">
          {card.citation && <p className={textCls} style={metaStyle}>{card.citation}</p>}
          <p className={textCls} style={card.content ? bodyStyle : mutedStyle}>{card.content || 'No verse text'}</p>
          {card.footerText && <p className={textCls} style={{ ...metaStyle, fontStyle: 'italic' }}>{card.footerText}</p>}
        </div>
      )
    case 'text':
      return <p className={`${textCls} whitespace-pre-wrap`} style={card.content ? bodyStyle : mutedStyle}>{card.content || 'No content'}</p>
    case 'reflection_mc':
      return (
        <div className="space-y-2">
          <p className={textCls} style={card.content ? bodyStyle : mutedStyle}>{card.content || 'No question'}</p>
          {card.options?.length > 0 && (
            <ul className="space-y-1 mt-2">
              {card.options.map((opt, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border flex-shrink-0" style={{ borderColor: '#C5B49A' }} />
                  <span className={textCls} style={opt ? bodyStyle : mutedStyle}>{opt || `Option ${i + 1}`}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )
    case 'reflection_final':
      return (
        <div className="space-y-1.5">
          <p className={textCls} style={card.content ? bodyStyle : mutedStyle}>{card.content || 'No prompt'}</p>
        </div>
      )
    case 'media':
      return (
        <div className="space-y-1">
          <p className={textCls} style={card.url ? { color: '#B8874A', fontFamily: 'var(--font-mulish)', wordBreak: 'break-all' } : mutedStyle}>{card.url || 'No URL'}</p>
          {card.caption && <p className={textCls} style={metaStyle}>{card.caption}</p>}
        </div>
      )
  }
}

/* ─── add card menu ───────────────────────────────────────── */

const CARD_TYPES: { type: AddableCardType; label: string }[] = [
  { type: 'verse',          label: 'Verse' },
  { type: 'text',           label: 'Thought for Today' },
  { type: 'reflection_mc',  label: 'Multiple Choice' },
]

/* ─── main component ──────────────────────────────────────── */

export function GardenContentEditor({ garden }: Props) {
  const [content, setContent] = useState<GardenContent>(normalizeContent(garden))
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editCard, setEditCard] = useState<GardenCard | null>(null)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

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
    if (!editCard) return
    const next: GardenContent = {
      ...content,
      cards: content.cards.map((c, i) => (i === index ? editCard : c)),
    }
    setContent(next)
    setEditingIndex(null)
    setEditCard(null)
    await persist(next)
  }

  async function addCard(type: AddableCardType) {
    const card = newCard(type)
    const next: GardenContent = { ...content, cards: [...content.cards, card] }
    setContent(next)
    setEditingIndex(next.cards.length - 1)
    setEditCard(card)
    setShowAddMenu(false)
    await persist(next)
  }

  async function removeCard(index: number) {
    const next: GardenContent = { ...content, cards: content.cards.filter((_, i) => i !== index) }
    setContent(next)
    if (editingIndex === index) { setEditingIndex(null); setEditCard(null) }
    await persist(next)
  }

  function startEdit(index: number) {
    setEditingIndex(index)
    setEditCard(content.cards[index])
  }

  function cancelEdit() {
    setEditingIndex(null)
    setEditCard(null)
  }

  return (
    <div>
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm mb-5" style={{ background: 'rgba(139,58,58,0.08)', border: '1px solid rgba(139,58,58,0.2)', color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}>
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-xl px-4 py-3 text-sm mb-5" style={{ background: 'rgba(90,138,106,0.08)', border: '1px solid rgba(90,138,106,0.2)', color: '#5A8A6A', fontFamily: 'var(--font-mulish)' }}>
          Saved successfully
        </div>
      )}

      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <p className="section-label">Cards</p>
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(v => !v)}
              className="text-xs font-semibold transition-colors"
              style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}
            >
              + Add card
            </button>
            {showAddMenu && (
              <div className="absolute right-0 top-6 z-20 rounded-xl shadow-lg overflow-hidden" style={{ background: '#FDF8F2', border: '1px solid #EAD9C4', minWidth: 180 }}>
                {CARD_TYPES.map(({ type, label }) => (
                  <button
                    key={type}
                    onClick={() => addCard(type)}
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[rgba(184,135,74,0.08)]"
                    style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
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
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-2.5" style={{ background: 'rgba(230,218,200,0.3)', borderBottom: '1px solid #EAD9C4' }}>
              <span className="section-label" style={{ color: '#C5B49A' }}>{cardLabel(card)}</span>
              <div className="flex gap-3">
                {editingIndex !== index ? (
                  <>
                    <button onClick={() => startEdit(index)} className="text-xs font-semibold transition-colors" style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}>
                      Edit
                    </button>
                    <button onClick={() => removeCard(index)} className="text-xs font-semibold transition-colors" style={{ color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}>
                      Remove
                    </button>
                  </>
                ) : (
                  <span className="text-xs" style={{ color: '#C5B49A', fontFamily: 'var(--font-mulish)' }}>Editing…</span>
                )}
              </div>
            </div>

            {/* Card body */}
            <div className="px-5 py-4">
              {editingIndex === index && editCard ? (
                <div className="space-y-4">
                  <CardEditForm card={editCard} onChange={setEditCard} />
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => saveCard(index)} disabled={saving} className="btn-gold text-xs px-4 py-2">
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-xs font-medium px-4 py-2 rounded-full transition-colors"
                      style={{ color: '#8A7060', background: 'rgba(138,112,96,0.08)', fontFamily: 'var(--font-mulish)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <CardPreview card={card} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
