import { verifySession } from '@/lib/dal'
import { getVideos, getVideoGardens } from '@/lib/api/videos'
import Link from 'next/link'
import type { GardenListItem, GardenStatus } from '@/lib/api/types'

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default async function DashboardPage() {
  const user = await verifySession()

  const videos = await getVideos().catch(() => [])

  // Gather all gardens across videos
  const allGardens: GardenListItem[] = []
  for (const video of videos) {
    const gardens = await getVideoGardens(video.id).catch(() => [])
    allGardens.push(...gardens)
  }

  const readyGardens = allGardens.filter((g) => g.status === 'ready')
  const processingVideos = videos.filter((v) => v.status === 'processing')

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
          {user.church_name ?? "(no church)"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-9">
        {[
          { label: 'Sermons', value: videos.length, href: '/sermons', delay: '0.05s' },
          { label: 'Processing', value: processingVideos.length, href: '/sermons', delay: '0.12s', highlight: processingVideos.length > 0 },
          { label: 'Total Gardens', value: allGardens.length, href: '/garden', delay: '0.19s' },
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

      {/* Recently ready gardens */}
      {readyGardens.length > 0 && (
        <section className="mb-8 anim-fadeUp" style={{ animationDelay: '0.25s' }}>
          <p className="section-label mb-3">Recent gardens</p>
          <div className="space-y-2">
            {readyGardens.slice(0, 5).map((garden, i) => (
              <GardenRow key={garden.id} garden={garden} delay={`${0.28 + i * 0.06}s`} />
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
            { href: '/garden',         title: 'View Gardens',   desc: 'Browse AI-generated devotional gardens' },
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

function GardenRow({ garden, delay }: { garden: GardenListItem; delay: string }) {
  return (
    <Link
      href={`/garden/${garden.id}`}
      className="surface flex items-center justify-between px-5 py-4 hover:scale-[1.005] transition-transform duration-200 anim-fadeUp group"
      style={{ animationDelay: delay }}
    >
      <div>
        <p
          className="text-sm font-semibold group-hover:text-[#B8874A] transition-colors"
          style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}
        >
          Day {garden.day_number} — {DAY_NAMES[garden.day_number] || `Day ${garden.day_number}`}
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
          {garden.topic}
        </p>
      </div>
      <span
        className="shrink-0 text-xs font-semibold rounded-full px-3 py-1"
        style={{ background: 'rgba(90,138,106,0.12)', color: '#5A8A6A', fontFamily: 'var(--font-mulish)' }}
      >
        View →
      </span>
    </Link>
  )
}
