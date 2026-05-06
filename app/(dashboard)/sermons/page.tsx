import { getVideos } from '@/lib/api/videos'
import { verifySession } from '@/lib/dal'
import { formatGardenDateShort } from '@/lib/dates'
import { SermonListAutoRefresh } from '@/components/sermon-list-auto-refresh'
import type { ActiveVideo } from '@/components/sermon-list-auto-refresh'
import Link from 'next/link'
import type { VideoStatus } from '@/lib/api/types'

const STATUS: Record<VideoStatus, { label: string; color: string; bg: string }> = {
  pending_upload:   { label: 'Pending',           color: '#9A8878', bg: 'rgba(154,136,120,0.1)' },
  downloading:      { label: 'Downloading',       color: '#5878A8', bg: 'rgba(88,120,168,0.1)' },
  transcoding:      { label: 'Transcoding',       color: '#B8874A', bg: 'rgba(184,135,74,0.12)' },
  transcode_failed: { label: 'Transcode Failed',  color: '#8B3A3A', bg: 'rgba(139,58,58,0.08)' },
  uploaded:         { label: 'Uploaded',          color: '#5878A8', bg: 'rgba(88,120,168,0.1)' },
  processing:       { label: 'Processing',        color: '#B8874A', bg: 'rgba(184,135,74,0.12)' },
  ready:            { label: 'Ready',             color: '#5A8A6A', bg: 'rgba(90,138,106,0.12)' },
  error:            { label: 'Error',             color: '#8B3A3A', bg: 'rgba(139,58,58,0.08)' },
}

// Statuses where the row may still mutate (status, thumbnail_url,
// summary, etc.) on the backend. While any visible row is in one of
// these, the page auto-refreshes every 15s so the user doesn't have
// to manually reload. Terminal states (ready, error, transcode_failed)
// are excluded.
const ACTIVE_STATUSES: ReadonlySet<VideoStatus> = new Set([
  'pending_upload',
  'downloading',
  'transcoding',
  'uploaded',
  'processing',
])


export default async function SermonsPage() {
  const user = await verifySession()
  let videos: Awaited<ReturnType<typeof getVideos>> = []
  let videoError: string | null = null
  try {
    videos = await getVideos(user.church_id)
  } catch (e) {
    videoError = e instanceof Error ? e.message : String(e)
  }
  const hasActive = videos.some((v) => ACTIVE_STATUSES.has(v.status))
  const activeVideos: ActiveVideo[] = videos
    .filter((v) => ACTIVE_STATUSES.has(v.status))
    .map((v) => ({ id: v.id, title: v.title, status: v.status }))

  return (
    <div className="px-8 py-9 max-w-5xl mx-auto">
      <SermonListAutoRefresh hasActive={hasActive} activeVideos={activeVideos} />
      <div className="flex items-end justify-between mb-8 anim-fadeUp">
        <div>
          <p className="section-label mb-2">Content</p>
          <h1
            className="text-4xl leading-tight"
            style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F', fontStyle: 'italic' }}
          >
            Sermons.
          </h1>
          <p className="text-sm mt-1" style={{ color: '#7A6A58', fontFamily: 'var(--font-mulish)' }}>
            Your video library — uploaded, processed, and ready for your congregation.
          </p>
        </div>
        <Link
          href="/sermons/upload"
          className="btn-gold px-5 py-2.5 text-sm shrink-0"
        >
          + Upload sermon
        </Link>
      </div>

      {videoError && (
        <div className="mb-4 p-4 rounded bg-red-50 border border-red-200 text-red-700 text-sm font-mono break-all">
          API error: {videoError}
        </div>
      )}

      {videos.length === 0 ? (
        <div
          className="surface px-8 py-20 text-center anim-fadeIn"
          style={{ borderStyle: 'dashed' }}
        >
          <p
            className="text-2xl mb-3"
            style={{ fontFamily: 'var(--font-playfair)', color: '#C8B89A', fontStyle: 'italic' }}
          >
            No sermons yet.
          </p>
          <p className="text-sm mb-6" style={{ color: '#9A8878', fontFamily: 'var(--font-mulish)' }}>
            Upload your first sermon to get started.
          </p>
          <Link href="/sermons/upload" className="btn-gold inline-block px-6 py-2.5 text-sm">
            Upload sermon
          </Link>
        </div>
      ) : (
        <div
          className="surface overflow-hidden anim-fadeUp"
          style={{ animationDelay: '0.08s', padding: 0 }}
        >
          <div
            className="grid text-xs font-semibold px-5 py-3"
            style={{
              gridTemplateColumns: '1fr 110px 100px 100px',
              background: 'rgba(200,182,155,0.18)',
              borderBottom: '1px solid rgba(200,182,155,0.45)',
              color: '#9A8878',
              fontFamily: 'var(--font-mulish)',
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
            }}
          >
            <span>Title</span>
            <span>Date</span>
            <span>Status</span>
            <span>Gardens</span>
          </div>
          {videos.map((video, i) => {
            const s = STATUS[video.status] ?? STATUS.pending_upload
            const isActive = video.role === 'primary'
            return (
              <Link
                key={video.id}
                href={`/sermons/${video.id}`}
                className="grid items-center px-5 py-3.5 anim-fadeUp hover:bg-[rgba(200,182,155,0.08)] transition-colors"
                style={{
                  gridTemplateColumns: '1fr 110px 100px 100px',
                  borderBottom: i < videos.length - 1 ? '1px solid rgba(200,182,155,0.3)' : 'none',
                  animationDelay: `${0.1 + i * 0.04}s`,
                }}
              >
                <span
                  className="text-sm font-semibold truncate pr-4"
                  style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}
                >
                  {video.title || <span style={{ color: '#C8B89A', fontStyle: 'italic' }}>Untitled</span>}
                </span>
                <span
                  className="text-xs pr-4"
                  style={{ color: '#7A6A58', fontFamily: 'var(--font-mulish)' }}
                >
                  {formatGardenDateShort(video.video_date)}
                </span>
                <span>
                  <span
                    className="text-xs font-semibold rounded-full px-2.5 py-1"
                    style={{ background: s.bg, color: s.color, fontFamily: 'var(--font-mulish)' }}
                  >
                    {s.label}
                  </span>
                </span>
                <span>
                  {isActive && (
                    <span
                      className="text-xs font-semibold rounded-full px-2.5 py-1"
                      style={{ background: 'rgba(90,138,106,0.12)', color: '#5A8A6A', fontFamily: 'var(--font-mulish)' }}
                    >
                      Active
                    </span>
                  )}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
