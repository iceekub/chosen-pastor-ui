'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Garden } from '@/lib/api/types'

interface Props {
  garden: Garden
  readOnly?: boolean
}

export function GardenNameHeader({ garden, readOnly = false }: Props) {
  const router = useRouter()
  const initialTitle = garden.content_json?.title ?? garden.topic ?? ''
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(initialTitle)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  async function save() {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === initialTitle) {
      setDraft(initialTitle)
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      // Merge new title into existing content_json so cards are preserved.
      const mergedContentJson = { ...(garden.content_json ?? {}), title: trimmed }
      const res = await fetch(`/api/gardens/${garden.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: trimmed, content_json: mergedContentJson }),
      })
      if (!res.ok) throw new Error('Save failed')
      setEditing(false)
      router.refresh()
    } catch {
      setDraft(initialTitle)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); save() }
    if (e.key === 'Escape') { setDraft(initialTitle); setEditing(false) }
  }

  if (readOnly) {
    return (
      <h1
        className="text-3xl leading-tight"
        style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F', fontStyle: 'italic' }}
      >
        {draft}
      </h1>
    )
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={onKeyDown}
        disabled={saving}
        className="text-3xl leading-tight bg-transparent border-b outline-none w-full"
        style={{
          fontFamily: 'var(--font-playfair)',
          color: '#2C1E0F',
          fontStyle: 'italic',
          borderColor: '#B8874A',
        }}
      />
    )
  }

  return (
    <h1
      onClick={() => setEditing(true)}
      title="Click to edit"
      className="text-3xl leading-tight cursor-text group"
      style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F', fontStyle: 'italic' }}
    >
      {draft}
      <span
        className="ml-2 opacity-0 group-hover:opacity-40 transition-opacity text-base not-italic"
        style={{ fontFamily: 'var(--font-mulish)', color: '#B8874A' }}
      >
        ✎
      </span>
    </h1>
  )
}
