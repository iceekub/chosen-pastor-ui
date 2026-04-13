'use client'

import { useState } from 'react'
import type { Garden } from '@/lib/api/types'

interface Props {
  garden: Garden
}

export function GardenContentEditor({ garden }: Props) {
  // Parse content_markdown into sections separated by ---
  const initialSections = garden.content_markdown
    ? garden.content_markdown.split(/\n---\n/).map((s) => s.trim()).filter(Boolean)
    : []

  const [sections, setSections] = useState<string[]>(initialSections)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editingFull, setEditingFull] = useState(false)
  const [fullContent, setFullContent] = useState(garden.content_markdown ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function sectionsToMarkdown(secs: string[]): string {
    return secs.join('\n\n---\n\n')
  }

  async function saveContent(markdown: string) {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(`/api/gardens/${garden.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_markdown: markdown }),
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

  async function saveSection(index: number) {
    const updated = [...sections]
    updated[index] = editContent
    setSections(updated)
    setEditingIndex(null)
    await saveContent(sectionsToMarkdown(updated))
  }

  async function saveFullContent() {
    const parsed = fullContent.split(/\n---\n/).map((s) => s.trim()).filter(Boolean)
    setSections(parsed)
    setEditingFull(false)
    await saveContent(fullContent)
  }

  function addSection() {
    const updated = [...sections, '']
    setSections(updated)
    setEditingIndex(updated.length - 1)
    setEditContent('')
  }

  function removeSection(index: number) {
    const updated = sections.filter((_, i) => i !== index)
    setSections(updated)
    saveContent(sectionsToMarkdown(updated))
  }

  return (
    <div>
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm mb-5"
          style={{
            background: 'rgba(139,58,58,0.08)',
            border: '1px solid rgba(139,58,58,0.2)',
            color: '#8B3A3A',
            fontFamily: 'var(--font-mulish)',
          }}
        >
          {error}
        </div>
      )}

      {saved && (
        <div
          className="rounded-xl px-4 py-3 text-sm mb-5"
          style={{
            background: 'rgba(90,138,106,0.08)',
            border: '1px solid rgba(90,138,106,0.2)',
            color: '#5A8A6A',
            fontFamily: 'var(--font-mulish)',
          }}
        >
          Saved successfully
        </div>
      )}

      {/* Card-style section editing */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <p className="section-label">Cards</p>
          <div className="flex gap-2">
            <button
              onClick={addSection}
              className="text-xs font-semibold transition-colors"
              style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}
            >
              + Add card
            </button>
            <button
              onClick={() => {
                setFullContent(sectionsToMarkdown(sections))
                setEditingFull(!editingFull)
                setEditingIndex(null)
              }}
              className="text-xs font-semibold transition-colors"
              style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}
            >
              {editingFull ? 'Card view' : 'Edit full'}
            </button>
          </div>
        </div>

        {editingFull ? (
          <div className="surface p-5 space-y-3">
            <textarea
              value={fullContent}
              onChange={(e) => setFullContent(e.target.value)}
              rows={16}
              className="input-warm resize-y w-full"
              style={{ fontFamily: 'var(--font-mulish)', fontSize: '0.875rem' }}
              placeholder="Write garden content here. Separate cards with ---"
            />
            <div className="flex gap-2">
              <button
                onClick={saveFullContent}
                disabled={saving}
                className="btn-gold text-xs px-4 py-2"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setEditingFull(false)}
                className="text-xs font-medium px-4 py-2 rounded-full transition-colors"
                style={{ color: '#8A7060', background: 'rgba(138,112,96,0.08)', fontFamily: 'var(--font-mulish)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {sections.length === 0 && (
              <div className="surface px-8 py-12 text-center" style={{ borderStyle: 'dashed' }}>
                <p className="text-sm" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
                  No content yet. Add a card or edit the full content.
                </p>
              </div>
            )}

            {sections.map((section, index) => (
              <div key={index} className="surface overflow-hidden anim-fadeUp" style={{ animationDelay: `${index * 0.06}s` }}>
                {/* Card header */}
                <div
                  className="flex items-center justify-between px-5 py-2.5"
                  style={{ background: 'rgba(230,218,200,0.3)', borderBottom: '1px solid #EAD9C4' }}
                >
                  <span className="section-label" style={{ color: '#C5B49A' }}>Card {index + 1}</span>
                  <div className="flex gap-3">
                    {editingIndex !== index && (
                      <>
                        <button
                          onClick={() => { setEditingIndex(index); setEditContent(section) }}
                          className="text-xs font-semibold transition-colors"
                          style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => removeSection(index)}
                          className="text-xs font-semibold transition-colors"
                          style={{ color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Card body */}
                <div className="px-5 py-4">
                  {editingIndex === index ? (
                    <div className="space-y-3">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={4}
                        className="input-warm resize-y w-full"
                        style={{ fontFamily: 'var(--font-mulish)' }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveSection(index)}
                          disabled={saving}
                          className="btn-gold text-xs px-4 py-2"
                        >
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingIndex(null)}
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
                      style={{ fontFamily: 'var(--font-mulish)', color: section ? '#2C1E0F' : '#C5B49A', fontStyle: section ? 'normal' : 'italic' }}
                    >
                      {section || 'No content'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
