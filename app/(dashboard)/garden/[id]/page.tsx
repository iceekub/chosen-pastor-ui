import { getGarden } from '@/lib/api/garden'
import { verifySession } from '@/lib/dal'
import { formatGardenDateLong } from '@/lib/dates'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { GardenContentEditor } from '@/components/garden-content-editor'
import type { GardenStatus } from '@/lib/api/types'

const STATUS: Record<GardenStatus, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pending',    color: '#9A8878', bg: 'rgba(154,136,120,0.1)' },
  generating: { label: 'Generating', color: '#B8874A', bg: 'rgba(184,135,74,0.12)' },
  reviewing:  { label: 'Reviewing',  color: '#9A8878', bg: 'rgba(154,136,120,0.1)' },
  ready:      { label: 'Ready',      color: '#5A8A6A', bg: 'rgba(90,138,106,0.12)' },
  error:      { label: 'Error',      color: '#8B3A3A', bg: 'rgba(139,58,58,0.08)' },
}

interface Props { params: Promise<{ id: string }> }

export default async function GardenDetailPage({ params }: Props) {
  await verifySession()
  const { id } = await params
  const garden = await getGarden(id).catch(() => null)
  if (!garden) notFound()

  const s = STATUS[garden.status] ?? STATUS.pending

  return (
    <div className="px-8 py-9 max-w-3xl mx-auto">
      <Link
        href="/garden"
        className="inline-flex items-center gap-1.5 text-xs mb-6 anim-fadeIn"
        style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)', fontWeight: 500 }}
      >
        &larr; Back to Garden
      </Link>

      <div className="flex items-start justify-between gap-4 mb-7 anim-fadeUp">
        <div>
          <p className="section-label mb-2">{formatGardenDateLong(garden.garden_date)}</p>
          <h1
            className="text-3xl leading-tight"
            style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F', fontStyle: 'italic' }}
          >
            {garden.topic}
          </h1>
        </div>
        <span
          className="shrink-0 text-xs font-semibold rounded-full px-3 py-1.5 mt-1"
          style={{ background: s.bg, color: s.color, fontFamily: 'var(--font-mulish)' }}
        >
          {s.label}
        </span>
      </div>

      {garden.status === 'generating' && (
        <div className="surface px-6 py-5 mb-6 anim-fadeUp" style={{ animationDelay: '0.08s' }}>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: '#B8874A' }} />
            <p className="text-sm" style={{ fontFamily: 'var(--font-mulish)', color: '#8A7060' }}>
              Content is being generated…
            </p>
          </div>
        </div>
      )}

      {garden.status === 'error' && garden.error_message && (
        <div
          className="surface px-6 py-5 mb-6 anim-fadeUp"
          style={{ animationDelay: '0.08s', borderColor: 'rgba(139,58,58,0.2)' }}
        >
          <p className="text-sm" style={{ fontFamily: 'var(--font-mulish)', color: '#8B3A3A' }}>
            {garden.error_message}
          </p>
        </div>
      )}

      {/* Editable content — shown when garden is ready or has content */}
      {(garden.status === 'ready' || garden.content_json) && (
        <div className="anim-fadeUp" style={{ animationDelay: '0.1s' }}>
          <GardenContentEditor garden={garden} />
        </div>
      )}

      {/* Empty state for pending gardens with no content yet */}
      {garden.status === 'pending' && !garden.content_json && (
        <div className="anim-fadeUp" style={{ animationDelay: '0.1s' }}>
          <GardenContentEditor garden={garden} />
        </div>
      )}
    </div>
  )
}
