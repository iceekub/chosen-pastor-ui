import { getGarden } from '@/lib/api/garden'
import { verifySession } from '@/lib/dal'
import { GardenCardEditor } from '@/components/garden-card-editor'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface Props { params: Promise<{ id: string }> }

export default async function GardenDetailPage({ params }: Props) {
  await verifySession()
  const { id } = await params
  const garden = await getGarden(Number(id)).catch(() => null)
  if (!garden) notFound()

  const statusStyles: Record<string, { label: string; color: string; bg: string }> = {
    draft:            { label: 'Draft',        color: '#8A7060', bg: 'rgba(138,112,96,0.1)' },
    pending_approval: { label: 'Needs review', color: '#B8874A', bg: 'rgba(184,135,74,0.12)' },
    approved:         { label: 'Approved',     color: '#5A8A6A', bg: 'rgba(90,138,106,0.12)' },
    live:             { label: 'Live',         color: '#5A8A6A', bg: 'rgba(90,138,106,0.18)' },
  }
  const s = statusStyles[garden.status] ?? statusStyles.draft

  return (
    <div className="px-8 py-9 max-w-3xl mx-auto">
      <Link
        href="/garden"
        className="inline-flex items-center gap-1.5 text-xs mb-6 anim-fadeIn"
        style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)', fontWeight: 500 }}
      >
        ← Back to Garden
      </Link>

      <div className="flex items-start justify-between gap-4 mb-7 anim-fadeUp">
        <div>
          <p className="section-label mb-2">Garden review</p>
          <h1
            className="text-3xl leading-tight"
            style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F', fontStyle: 'italic' }}
          >
            {garden.title}
          </h1>
          {garden.description && (
            <p className="text-sm mt-1.5" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
              {garden.description}
            </p>
          )}
          <p className="text-xs mt-1" style={{ color: '#C5B49A', fontFamily: 'var(--font-mulish)' }}>
            {garden.go_live_date
              ? `Goes live ${new Date(garden.go_live_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
              : 'No live date set'}
          </p>
        </div>
        <span
          className="shrink-0 text-xs font-semibold rounded-full px-3 py-1.5 mt-1"
          style={{ background: s.bg, color: s.color, fontFamily: 'var(--font-mulish)' }}
        >
          {s.label}
        </span>
      </div>

      <GardenCardEditor garden={garden} />
    </div>
  )
}
