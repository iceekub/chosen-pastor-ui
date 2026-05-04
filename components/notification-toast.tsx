'use client'

import Link from 'next/link'
import { useNotifications, type AppNotification } from '@/lib/notifications'

const ICONS = {
  video_ready: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  gardens_ready: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V12" />
      <path d="M12 12C12 12 8 9 8 5a4 4 0 0 1 8 0c0 4-4 7-4 7z" />
      <path d="M12 12C12 12 16 9 16 5" />
    </svg>
  ),
}

const MESSAGES = {
  video_ready: (title: string) => ({
    heading: 'Sermon processed',
    body: `"${title}" has been transcribed and is ready.`,
  }),
  gardens_ready: (title: string) => ({
    heading: 'Gardens ready',
    body: `Daily gardens for "${title}" have been generated.`,
  }),
}

function Toast({ n }: { n: AppNotification }) {
  const { dismissNotification } = useNotifications()
  const msg = MESSAGES[n.type](n.title)

  return (
    <div
      className="anim-fadeUp flex items-start gap-3 rounded-2xl shadow-lg px-4 py-3.5 max-w-sm w-full"
      style={{
        background: '#FAF6F0',
        border: '1px solid #E8D9C4',
        boxShadow: '0 4px 24px rgba(44,30,15,0.13)',
      }}
      role="status"
      aria-live="polite"
    >
      <div
        className="mt-0.5 shrink-0 rounded-full p-1.5"
        style={{ background: 'rgba(90,138,106,0.12)', color: '#5A8A6A' }}
      >
        {ICONS[n.type]}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}>
          {msg.heading}
        </p>
        <p className="text-xs mt-0.5 leading-snug" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
          {msg.body}
        </p>
        <Link
          href={`/sermons/${n.videoId}`}
          className="text-xs font-semibold mt-1.5 inline-block"
          style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}
          onClick={() => dismissNotification(n.id)}
        >
          View sermon →
        </Link>
      </div>

      <button
        onClick={() => dismissNotification(n.id)}
        className="shrink-0 mt-0.5 text-lg leading-none"
        style={{ color: '#C5B49A', fontFamily: 'var(--font-mulish)' }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}

export function NotificationDisplay() {
  const { notifications } = useNotifications()
  if (!notifications.length) return null

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 items-end"
      aria-label="Notifications"
    >
      {notifications.map(n => (
        <Toast key={n.id} n={n} />
      ))}
    </div>
  )
}
