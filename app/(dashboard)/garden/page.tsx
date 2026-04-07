import { getGardens } from '@/lib/api/garden'
import { verifySession } from '@/lib/dal'
import Link from 'next/link'
import type { Garden } from '@/lib/api/types'

const STATUS: Record<Garden['status'], { label: string; color: string; bg: string }> = {
  draft:            { label: 'Draft',        color: '#8A7060', bg: 'rgba(138,112,96,0.1)' },
  pending_approval: { label: 'Needs review', color: '#B8874A', bg: 'rgba(184,135,74,0.12)' },
  approved:         { label: 'Approved',     color: '#5A8A6A', bg: 'rgba(90,138,106,0.12)' },
  live:             { label: 'Live',         color: '#5A8A6A', bg: 'rgba(90,138,106,0.18)' },
}

export default async function GardenPage() {
  await verifySession()
  const gardens = await getGardens().catch(() => [] as Garden[])

  const pending = gardens.filter((g) => g.status === 'pending_approval')
  const rest    = gardens.filter((g) => g.status !== 'pending_approval')

  return (
    <div className="px-8 py-9 max-w-5xl mx-auto">
      <div className="mb-8 anim-fadeUp">
        <p className="section-label mb-2">Content</p>
        <h1
          className="text-4xl leading-tight"
          style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F', fontStyle: 'italic' }}
        >
          Garden.
        </h1>
        <p className="text-sm mt-1" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
          Review and approve AI-generated daily card decks before they reach your congregation.
        </p>
      </div>

      {pending.length > 0 && (
        <section className="mb-10 anim-fadeUp" style={{ animationDelay: '0.08s' }}>
          <div className="flex items-center gap-3 mb-4">
            <p className="section-label">Needs review</p>
            <span
              className="text-xs font-bold rounded-full px-2 py-0.5"
              style={{ background: 'rgba(184,135,74,0.15)', color: '#B8874A', fontFamily: 'var(--font-mulish)' }}
            >
              {pending.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pending.map((g, i) => <GardenCard key={g.id} garden={g} delay={`${0.1 + i * 0.06}s`} />)}
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section className="anim-fadeUp" style={{ animationDelay: '0.14s' }}>
          <p className="section-label mb-4">All Gardens</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rest.map((g, i) => <GardenCard key={g.id} garden={g} delay={`${0.16 + i * 0.05}s`} />)}
          </div>
        </section>
      )}

      {gardens.length === 0 && (
        <div
          className="surface px-8 py-16 text-center anim-fadeIn"
          style={{ borderStyle: 'dashed' }}
        >
          <p className="text-sm" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
            Gardens will appear here once the AI generates them from your sermons.
          </p>
        </div>
      )}
    </div>
  )
}

function GardenCard({ garden, delay }: { garden: Garden; delay: string }) {
  const s = STATUS[garden.status]
  return (
    <Link
      href={`/garden/${garden.id}`}
      className="surface group block p-5 hover:scale-[1.01] transition-transform duration-200 anim-fadeUp"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <p
          className="text-sm font-semibold leading-snug group-hover:text-[#B8874A] transition-colors"
          style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}
        >
          {garden.title}
        </p>
        <span
          className="shrink-0 text-xs font-semibold rounded-full px-2.5 py-0.5"
          style={{ background: s.bg, color: s.color, fontFamily: 'var(--font-mulish)' }}
        >
          {s.label}
        </span>
      </div>
      {garden.description && (
        <p className="text-xs mb-2.5 line-clamp-2" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
          {garden.description}
        </p>
      )}
      <p className="text-xs" style={{ color: '#C5B49A', fontFamily: 'var(--font-mulish)' }}>
        {garden.go_live_date
          ? new Date(garden.go_live_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'No date set'}
        {' · '}
        {garden.cards?.length ?? 0} cards
      </p>
    </Link>
  )
}
