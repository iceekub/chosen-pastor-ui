import { getVideos, getVideoGardens } from '@/lib/api/videos'
import { verifySession } from '@/lib/dal'
import { formatGardenDateLong } from '@/lib/dates'
import Link from 'next/link'
import type { GardenListItem, GardenStatus, VideoListItem } from '@/lib/api/types'

const STATUS: Record<GardenStatus, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pending',    color: '#9A8878', bg: 'rgba(154,136,120,0.1)' },
  generating: { label: 'Generating', color: '#B8874A', bg: 'rgba(184,135,74,0.12)' },
  reviewing:  { label: 'Reviewing',  color: '#9A8878', bg: 'rgba(154,136,120,0.1)' },
  ready:      { label: 'Ready',      color: '#5A8A6A', bg: 'rgba(90,138,106,0.12)' },
  error:      { label: 'Error',      color: '#8B3A3A', bg: 'rgba(139,58,58,0.08)' },
}

interface SermonGardens {
  video: VideoListItem
  gardens: GardenListItem[]
}

export default async function GardenPage() {
  await verifySession()
  const videos = await getVideos().catch(() => [])

  // Fetch gardens for each video that might have them
  const sermonGardens: SermonGardens[] = []
  for (const video of videos) {
    const gardens = await getVideoGardens(video.id).catch(() => [])
    if (gardens.length > 0) {
      sermonGardens.push({ video, gardens })
    }
  }

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
          Review AI-generated daily devotional gardens from your sermons.
        </p>
      </div>

      {sermonGardens.length === 0 ? (
        <div
          className="surface px-8 py-16 text-center anim-fadeIn"
          style={{ borderStyle: 'dashed' }}
        >
          <p className="text-sm" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
            Gardens will appear here once generated from your sermons.
          </p>
          <Link
            href="/sermons"
            className="btn-gold inline-block mt-4 px-5 py-2 text-sm"
          >
            Go to Sermons
          </Link>
        </div>
      ) : (
        sermonGardens.map(({ video, gardens }, si) => (
          <section
            key={video.id}
            className="mb-10 anim-fadeUp"
            style={{ animationDelay: `${0.08 + si * 0.06}s` }}
          >
            <div className="flex items-center gap-3 mb-4">
              <p className="section-label">{video.title}</p>
              <Link
                href={`/sermons/${video.id}`}
                className="text-xs underline"
                style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}
              >
                View sermon
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {gardens
                .slice()
                .sort((a, b) => a.garden_date.localeCompare(b.garden_date))
                .map((garden, i) => (
                  <GardenCard key={garden.id} garden={garden} delay={`${0.1 + i * 0.05}s`} />
                ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

function GardenCard({ garden, delay }: { garden: GardenListItem; delay: string }) {
  const s = STATUS[garden.status] ?? STATUS.pending
  return (
    <Link
      href={`/garden/${garden.id}`}
      className="surface group block p-5 hover:scale-[1.01] transition-transform duration-200 anim-fadeUp"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p
          className="text-sm font-semibold leading-snug group-hover:text-[#B8874A] transition-colors"
          style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}
        >
          {formatGardenDateLong(garden.garden_date)}
        </p>
        <span
          className="shrink-0 text-xs font-semibold rounded-full px-2.5 py-0.5"
          style={{ background: s.bg, color: s.color, fontFamily: 'var(--font-mulish)' }}
        >
          {s.label}
        </span>
      </div>
      <p className="text-xs line-clamp-2" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
        {garden.topic}
      </p>
    </Link>
  )
}
