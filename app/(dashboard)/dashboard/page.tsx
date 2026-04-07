import { verifySession } from '@/lib/dal'
import { getSermons } from '@/lib/api/sermons'
import { getGardens } from '@/lib/api/garden'
import Link from 'next/link'
import type { Garden } from '@/lib/api/types'

export default async function DashboardPage() {
  const user = await verifySession()

  const [sermons, gardens] = await Promise.allSettled([getSermons(), getGardens()])
  const sermonList = sermons.status === 'fulfilled' ? sermons.value : []
  const gardenList = gardens.status === 'fulfilled' ? gardens.value : []
  const pendingGardens = gardenList.filter((g) => g.status === 'pending_approval')

  return (
    <div className="px-8 py-9 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-9 anim-fadeUp">
        <p className="section-label mb-2">Welcome back</p>
        <h1
          className="text-4xl leading-tight"
          style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F', fontStyle: 'italic' }}
        >
          {user.name.split(' ')[0]}.
        </h1>
        <p className="text-sm mt-1" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
          {user.congregation_name}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-9">
        {[
          { label: 'Sermons', value: sermonList.length, href: '/sermons', delay: '0.05s' },
          { label: 'Pending review', value: pendingGardens.length, href: '/garden', delay: '0.12s', highlight: pendingGardens.length > 0 },
          { label: 'Total Gardens', value: gardenList.length, href: '/garden', delay: '0.19s' },
        ].map(({ label, value, href, delay, highlight }) => (
          <Link
            key={label}
            href={href}
            className="surface anim-fadeUp group block px-6 py-5 hover:scale-[1.01] transition-transform duration-200"
            style={{ animationDelay: delay, borderColor: highlight ? 'rgba(184,135,74,0.4)' : undefined }}
          >
            <p
              className="text-3xl font-bold mb-1"
              style={{ fontFamily: 'var(--font-playfair)', color: highlight ? '#B8874A' : '#2C1E0F' }}
            >
              {value}
            </p>
            <p className="section-label">{label}</p>
          </Link>
        ))}
      </div>

      {/* Pending gardens */}
      {pendingGardens.length > 0 && (
        <section className="mb-8 anim-fadeUp" style={{ animationDelay: '0.25s' }}>
          <div className="flex items-center gap-3 mb-3">
            <p className="section-label">Needs your review</p>
            <span
              className="text-xs font-bold rounded-full px-2 py-0.5"
              style={{ background: 'rgba(184,135,74,0.15)', color: '#B8874A', fontFamily: 'var(--font-mulish)' }}
            >
              {pendingGardens.length}
            </span>
          </div>
          <div className="space-y-2">
            {pendingGardens.map((garden, i) => (
              <GardenPendingRow key={garden.id} garden={garden} delay={`${0.28 + i * 0.06}s`} />
            ))}
          </div>
        </section>
      )}

      {/* Quick actions */}
      <section className="anim-fadeUp" style={{ animationDelay: '0.32s' }}>
        <p className="section-label mb-3">Quick actions</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { href: '/sermons/upload', title: 'Upload sermon', desc: 'Add a new video to the library' },
            { href: '/garden',         title: 'Review Garden',  desc: 'Approve AI-generated card decks' },
            { href: '/documents',      title: 'Add document',   desc: 'Upload reference material for the AI' },
          ].map(({ href, title, desc }, i) => (
            <Link
              key={href}
              href={href}
              className="surface group block px-5 py-4 hover:scale-[1.01] transition-transform duration-200 anim-fadeUp"
              style={{ animationDelay: `${0.35 + i * 0.07}s` }}
            >
              <p
                className="text-sm font-semibold mb-0.5 group-hover:text-[#B8874A] transition-colors"
                style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}
              >
                {title}
              </p>
              <p className="text-xs" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>{desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function GardenPendingRow({ garden, delay }: { garden: Garden; delay: string }) {
  return (
    <Link
      href={`/garden/${garden.id}`}
      className="surface flex items-center justify-between px-5 py-4 hover:scale-[1.005] transition-transform duration-200 anim-fadeUp group"
      style={{ animationDelay: delay, borderColor: 'rgba(184,135,74,0.3)' }}
    >
      <div>
        <p
          className="text-sm font-semibold group-hover:text-[#B8874A] transition-colors"
          style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}
        >
          {garden.title}
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
          {garden.go_live_date
            ? `Goes live ${new Date(garden.go_live_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
            : 'No live date set'}
          {' · '}
          {garden.cards?.length ?? 0} cards
        </p>
      </div>
      <span
        className="shrink-0 text-xs font-semibold rounded-full px-3 py-1"
        style={{ background: 'rgba(184,135,74,0.12)', color: '#B8874A', fontFamily: 'var(--font-mulish)' }}
      >
        Review →
      </span>
    </Link>
  )
}
