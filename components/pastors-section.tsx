'use client'

import { useState, useTransition, useRef } from 'react'
import { ImageUpload } from '@/components/image-upload'
import {
  createPastorAction,
  updatePastorAction,
  deletePastorAction,
  reorderPastorsAction,
} from '@/app/actions/pastors'
import { uploadPastorAvatarAction } from '@/app/actions/storage'
import type { Pastor } from '@/lib/api/types'

interface Props {
  initialPastors: Pastor[]
}

const labelStyle: React.CSSProperties = {
  color: '#8A7060',
  fontFamily: 'var(--font-mulish)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  fontSize: 11,
  fontWeight: 700,
}

/* ── Avatar ──────────────────────────────────────────────────── */

function PastorAvatar({
  pastor,
  onUploaded,
}: {
  pastor: Pastor
  onUploaded: (url: string) => void
}) {
  // Bind the pastor ID client-side — safe for a non-sensitive slug
  const uploadAction = uploadPastorAvatarAction.bind(null, pastor.id)

  return (
    <div className="w-14 h-14 shrink-0">
      <ImageUpload
        action={uploadAction}
        currentUrl={pastor.avatar_url}
        label=""
        aspectRatio="1/1"
        onSuccess={onUploaded}
      />
    </div>
  )
}

/* ── Single pastor row ───────────────────────────────────────── */

function PastorRow({
  pastor,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onUpdate,
  onDelete,
}: {
  pastor: Pastor
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onUpdate: (updated: Pastor) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setEditing(true)
    setError(null)
  }

  function cancelEdit() {
    setEditing(false)
    setError(null)
  }

  function handleSave() {
    const formData = new FormData()
    formData.set('name', nameRef.current?.value ?? pastor.name)
    formData.set('title', titleRef.current?.value ?? pastor.title ?? '')

    startTransition(async () => {
      const result = await updatePastorAction.bind(null, pastor.id)(formData)
      if (result.error) {
        setError(result.error)
      } else if (result.pastor) {
        onUpdate(result.pastor)
        setEditing(false)
      }
    })
  }

  function handleDelete() {
    if (!confirm(`Remove ${pastor.name}?`)) return
    startTransition(async () => {
      const result = await deletePastorAction(pastor.id)
      if (result.error) setError(result.error)
      else onDelete(pastor.id)
    })
  }

  return (
    <li className="py-3.5 flex items-center gap-4" style={{ borderBottom: '1px solid rgba(200,182,155,0.25)' }}>
      {/* Avatar upload */}
      <PastorAvatar
        pastor={pastor}
        onUploaded={url => onUpdate({ ...pastor, avatar_url: url })}
      />

      {/* Name / title */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-1.5">
            <input
              ref={nameRef}
              defaultValue={pastor.name}
              placeholder="Full name"
              className="input-warm w-full text-sm"
              style={{ fontFamily: 'var(--font-mulish)' }}
            />
            <input
              ref={titleRef}
              defaultValue={pastor.title ?? ''}
              placeholder="Title (e.g. Lead Pastor)"
              className="input-warm w-full text-xs"
              style={{ fontFamily: 'var(--font-mulish)' }}
            />
            {error && (
              <p className="text-xs" style={{ color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}>{error}</p>
            )}
          </div>
        ) : (
          <p className="text-sm font-medium truncate" style={{ color: '#2C1E0F', fontFamily: 'var(--font-mulish)' }}>
            {pastor.name}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Order arrows — always visible when not editing */}
        {!editing && (
          <div className="flex flex-col gap-0.5">
            <button
              onClick={onMoveUp}
              disabled={!canMoveUp || isPending}
              className="p-0.5 rounded transition-colors disabled:opacity-20"
              style={{ color: '#C5B49A' }}
              aria-label="Move up"
            >
              <ChevronUpIcon />
            </button>
            <button
              onClick={onMoveDown}
              disabled={!canMoveDown || isPending}
              className="p-0.5 rounded transition-colors disabled:opacity-20"
              style={{ color: '#C5B49A' }}
              aria-label="Move down"
            >
              <ChevronDownIcon />
            </button>
          </div>
        )}

        {editing ? (
          <>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="text-xs font-semibold transition-colors"
              style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={cancelEdit}
              className="text-xs transition-colors"
              style={{ color: '#9A8878', fontFamily: 'var(--font-mulish)' }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={startEdit}
              className="text-xs font-semibold transition-colors"
              style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="text-xs font-semibold transition-colors"
              style={{ color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}
            >
              Remove
            </button>
          </>
        )}
      </div>
    </li>
  )
}

/* ── Add pastor form ─────────────────────────────────────────── */

function AddPastorForm({ onAdded }: { onAdded: (p: Pastor) => void }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const formData = new FormData()
    formData.set('name', nameRef.current?.value ?? '')
    formData.set('title', titleRef.current?.value ?? '')

    startTransition(async () => {
      const result = await createPastorAction(formData)
      if (result.error) {
        setError(result.error)
      } else if (result.pastor) {
        onAdded(result.pastor)
        setOpen(false)
        setError(null)
        if (nameRef.current) nameRef.current.value = ''
        if (titleRef.current) titleRef.current.value = ''
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-semibold transition-colors"
        style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}
      >
        + Add pastor
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl px-4 py-4 space-y-2.5 mt-3" style={{ background: 'rgba(184,135,74,0.04)', border: '1px solid rgba(200,182,155,0.35)' }}>
      <p className="text-xs font-semibold" style={{ ...labelStyle }}>New pastor</p>
      <input
        ref={nameRef}
        name="name"
        placeholder="Full name"
        required
        className="input-warm w-full text-sm"
        style={{ fontFamily: 'var(--font-mulish)' }}
      />
      <input
        ref={titleRef}
        name="title"
        placeholder="Title (e.g. Lead Pastor)"
        className="input-warm w-full text-sm"
        style={{ fontFamily: 'var(--font-mulish)' }}
      />
      {error && (
        <p className="text-xs" style={{ color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}>{error}</p>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="btn-gold text-xs px-4 py-2"
        >
          {isPending ? 'Adding…' : 'Add'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null) }}
          className="text-xs font-medium px-4 py-2 rounded-full transition-colors"
          style={{ color: '#8A7060', background: 'rgba(138,112,96,0.08)', fontFamily: 'var(--font-mulish)' }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

/* ── Main export ─────────────────────────────────────────────── */

export function PastorsSection({ initialPastors }: Props) {
  const [pastors, setPastors] = useState<Pastor[]>(initialPastors)
  const [, startReorderTransition] = useTransition()

  function handleUpdate(updated: Pastor) {
    setPastors(prev => prev.map(p => (p.id === updated.id ? updated : p)))
  }

  function handleDelete(id: string) {
    setPastors(prev => prev.filter(p => p.id !== id))
  }

  function handleAdded(pastor: Pastor) {
    setPastors(prev => [...prev, pastor])
  }

  function handleMove(index: number, direction: 'up' | 'down') {
    const next = [...pastors]
    const swapWith = direction === 'up' ? index - 1 : index + 1
    ;[next[index], next[swapWith]] = [next[swapWith], next[index]]
    setPastors(next)
    startReorderTransition(async () => {
      await reorderPastorsAction(next.map(p => p.id))
    })
  }

  return (
    <div>
      {pastors.length > 0 ? (
        <ul>
          {pastors.map((pastor, index) => (
            <PastorRow
              key={pastor.id}
              pastor={pastor}
              canMoveUp={index > 0}
              canMoveDown={index < pastors.length - 1}
              onMoveUp={() => handleMove(index, 'up')}
              onMoveDown={() => handleMove(index, 'down')}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm mb-3" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
          No pastors yet.
        </p>
      )}

      <div className="mt-3">
        <AddPastorForm onAdded={handleAdded} />
      </div>
    </div>
  )
}

/* ── Icons ───────────────────────────────────────────────────── */

function ChevronUpIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 15l-6-6-6 6" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}
