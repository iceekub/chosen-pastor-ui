'use client'

import { useState, useTransition } from 'react'
import type { Theme } from '@/lib/api/types'

interface Props {
  videoId: string
  initialAvailable: Theme[]
  initialTagged: Theme[]
}

/**
 * Add/remove themes on a sermon. Hits PostgREST directly via fetch
 * to keep state local (no full page reload on every toggle).
 */
export function ThemeTagger({ videoId, initialAvailable, initialTagged }: Props) {
  const [tagged, setTagged] = useState<Theme[]>(initialTagged)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const taggedIds = new Set(tagged.map((t) => t.id))
  const untagged = initialAvailable.filter((t) => !taggedIds.has(t.id))

  function applyTag(theme: Theme) {
    startTransition(async () => {
      setError(null)
      const res = await fetch(`/api/sermons/${videoId}/themes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme_id: theme.id }),
      })
      if (!res.ok) {
        setError('Failed to add theme.')
        return
      }
      setTagged((prev) => [...prev, theme].sort((a, b) => a.name.localeCompare(b.name)))
    })
  }

  function removeTag(theme: Theme) {
    startTransition(async () => {
      setError(null)
      const res = await fetch(
        `/api/sermons/${videoId}/themes?theme_id=${theme.id}`,
        { method: 'DELETE' },
      )
      if (!res.ok) {
        setError('Failed to remove theme.')
        return
      }
      setTagged((prev) => prev.filter((t) => t.id !== theme.id))
    })
  }

  return (
    <div>
      <div className="mb-4">
        <p className="section-label mb-2">Tagged</p>
        {tagged.length === 0 ? (
          <p
            className="text-sm"
            style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}
          >
            No themes yet — pick one below.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tagged.map((t) => (
              <button
                key={t.id}
                onClick={() => removeTag(t)}
                disabled={pending}
                className="text-xs font-semibold rounded-full px-3 py-1.5 transition-colors"
                style={{
                  background: 'rgba(184,135,74,0.16)',
                  color: '#8E6228',
                  fontFamily: 'var(--font-mulish)',
                }}
                aria-label={`Remove ${t.name}`}
              >
                {t.name} ✕
              </button>
            ))}
          </div>
        )}
      </div>

      {untagged.length > 0 && (
        <div>
          <p className="section-label mb-2">Available</p>
          <div className="flex flex-wrap gap-2">
            {untagged.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTag(t)}
                disabled={pending}
                className="text-xs font-medium rounded-full px-3 py-1.5 transition-colors"
                style={{
                  background: 'rgba(138,112,96,0.08)',
                  color: '#8A7060',
                  fontFamily: 'var(--font-mulish)',
                  border: '1px dashed rgba(138,112,96,0.28)',
                }}
              >
                + {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p
          className="text-xs mt-3"
          style={{ color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}
        >
          {error}
        </p>
      )}
    </div>
  )
}
