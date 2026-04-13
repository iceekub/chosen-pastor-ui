import { getVideo } from '@/lib/api/videos'
import { getVideoGardens } from '@/lib/api/videos'
import { verifySession } from '@/lib/dal'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { SermonDetailClient } from '@/components/sermon-detail-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SermonDetailPage({ params }: Props) {
  await verifySession()
  const { id } = await params
  const video = await getVideo(id).catch(() => null)
  if (!video) notFound()

  const gardens = await getVideoGardens(id).catch(() => [])

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
    </div>
  )
}
