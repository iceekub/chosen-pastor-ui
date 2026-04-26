import { getVideo, getVideoGardens } from '@/lib/api/videos'
import { listThemes, listThemesForVideo } from '@/lib/api/themes'
import { verifySession } from '@/lib/dal'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { SermonDetailClient } from '@/components/sermon-detail-client'
import { ThemeTagger } from '@/components/theme-tagger'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SermonDetailPage({ params }: Props) {
  await verifySession()
  const { id } = await params
  const video = await getVideo(id).catch(() => null)
  if (!video) notFound()

  const [gardens, allThemes, taggedThemes] = await Promise.all([
    getVideoGardens(id).catch(() => []),
    listThemes().catch(() => []),
    listThemesForVideo(id).catch(() => []),
  ])

  return (
    <div className="px-8 py-9 max-w-3xl mx-auto">
      <Link
        href="/sermons"
        className="inline-flex items-center gap-1.5 text-xs mb-6 anim-fadeIn"
        style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)', fontWeight: 500 }}
      >
        &larr; Back to Sermons
      </Link>

      <SermonDetailClient initialVideo={video} initialGardens={gardens} />

      <section
        className="surface px-6 py-5 mt-8 anim-fadeUp"
        style={{ animationDelay: '0.15s' }}
      >
        <h2
          className="text-base mb-4"
          style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F' }}
        >
          Themes
        </h2>
        <ThemeTagger
          videoId={id}
          initialAvailable={allThemes}
          initialTagged={taggedThemes}
        />
      </section>
    </div>
  )
}
