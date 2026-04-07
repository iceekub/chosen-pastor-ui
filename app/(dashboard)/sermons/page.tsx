import { getSermons } from '@/lib/api/sermons'
import { verifySession } from '@/lib/dal'
import Link from 'next/link'
import type { VideoState } from '@/lib/api/types'

const STATE: Record<VideoState, { label: string; color: string; bg: string }> = {
  0: { label: 'Waiting',    color: '#9A8878', bg: 'rgba(154,136,120,0.1)' },
  1: { label: 'Uploaded',   color: '#5878A8', bg: 'rgba(88,120,168,0.1)' },
  2: { label: 'Processing', color: '#B8874A', bg: 'rgba(184,135,74,0.12)' },
  3: { label: 'Ready',      color: '#5A8A6A', bg: 'rgba(90,138,106,0.12)' },
}

export default async function SermonsPage() {
  await verifySession()
  const sermons = await getSermons().catch(() => [])

  return (
    <div className="px-8 py-9 max-w-5xl mx-auto">
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

      {sermons.length === 0 ? (
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
              gridTemplateColumns: '1fr 140px 90px 100px',
              background: 'rgba(200,182,155,0.18)',
              borderBottom: '1px solid rgba(200,182,155,0.45)',
              color: '#9A8878',
              fontFamily: 'var(--font-mulish)',
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
            }}
          >
            <span>Title</span>
            <span>Tags</span>
            <span>Length</span>
            <span>Status</span>
          </div>
          {sermons.map((sermon, i) => {
            const s = STATE[sermon.state]
            return (
              <div
                key={sermon.id}
                className="grid items-center px-5 py-3.5 anim-fadeUp"
                style={{
                  gridTemplateColumns: '1fr 140px 90px 100px',
                  borderBottom: i < sermons.length - 1 ? '1px solid rgba(200,182,155,0.3)' : 'none',
                  animationDelay: `${0.1 + i * 0.04}s`,
                }}
              >
                <span
                  className="text-sm font-semibold truncate pr-4"
                  style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}
                >
                  {sermon.title || <span style={{ color: '#C8B89A', fontStyle: 'italic' }}>Untitled</span>}
                </span>
                <span
                  className="text-xs truncate pr-4"
                  style={{ color: '#7A6A58', fontFamily: 'var(--font-mulish)' }}
                >
                  {sermon.tags?.map((t) => t.name).join(', ') || '—'}
                </span>
                <span
                  className="text-xs pr-4"
                  style={{ color: '#7A6A58', fontFamily: 'var(--font-mulish)' }}
                >
                  {sermon.length ? formatDuration(sermon.length) : '—'}
                </span>
                <span>
                  <span
                    className="text-xs font-semibold rounded-full px-2.5 py-1"
                    style={{ background: s.bg, color: s.color, fontFamily: 'var(--font-mulish)' }}
                  >
                    {s.label}
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}
