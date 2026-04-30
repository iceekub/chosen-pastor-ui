'use client'

import { useState, useTransition } from 'react'

interface Props {
  gardenId: string
  initialDate: string | null
  onSave: (gardenId: string, date: string | null) => Promise<void>
}

export function GoLiveDateControl({ gardenId, initialDate, onSave }: Props) {
  const [date, setDate] = useState(initialDate ?? '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        await onSave(gardenId, date || null)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } catch (e) {
        setError((e as Error).message ?? 'Failed to save')
      }
    })
  }

  return (
    <div
      className="surface px-6 py-4 mb-6 anim-fadeUp flex items-center gap-4 flex-wrap"
      style={{ animationDelay: '0.06s' }}
    >
      <div className="flex-1 min-w-0">
        <p
          className="section-label mb-1"
          style={{ fontFamily: 'var(--font-mulish)' }}
        >
          Publish date
        </p>
        <p
          className="text-xs"
          style={{ fontFamily: 'var(--font-mulish)', color: '#9A8878' }}
        >
          Set to today or earlier to make this garden visible in the app.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="text-sm rounded-lg border px-3 py-2 outline-none focus:ring-2"
          style={{
            fontFamily: 'var(--font-mulish)',
            borderColor: 'rgba(184,135,74,0.3)',
            color: '#2C1E0F',
            background: '#FDFAF6',
          }}
        />
        <button
          onClick={save}
          disabled={isPending}
          className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
          style={{ fontFamily: 'var(--font-mulish)' }}
        >
          {isPending ? 'Saving…' : saved ? 'Saved ✓' : 'Publish'}
        </button>
      </div>
      {error && (
        <p
          className="w-full text-xs mt-1"
          style={{ color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}
        >
          {error}
        </p>
      )}
    </div>
  )
}
