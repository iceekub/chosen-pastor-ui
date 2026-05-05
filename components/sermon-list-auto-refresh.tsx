'use client'

/**
 * Notification strategy: we fire video_ready notifications from two places
 * so the pastor gets the toast regardless of which page they're on:
 *
 *   1. SermonListAutoRefresh (here) — covers the sermons list and dashboard,
 *      which are server components that can't hold client state. On each poll
 *      tick we fetch the current status for every active video, compare
 *      against last-known status (tracked in a ref), and call addNotification
 *      if any crossed the → ready threshold. Then router.refresh() re-renders
 *      the server page with fresh data as before.
 *
 *   2. SermonDetailClient — covers the sermon detail page, which has its own
 *      polling loop and holds the video object directly. It fires the same
 *      notification when it detects the same transition there.
 *
 * knownStatuses is seeded from the server-rendered activeVideos on mount so
 * we never fire for a video that was already ready before this component
 * mounted (e.g. after a hard refresh).
 */

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/lib/notifications'
import type { VideoStatus } from '@/lib/api/types'

export interface ActiveVideo {
  id: string
  title: string
  status: VideoStatus
}

interface Props {
  /**
   * True when at least one rendered video is in a non-terminal state.
   * The parent page computes this server-side; the component does nothing
   * while false.
   */
  hasActive: boolean
  /**
   * The subset of videos currently in a non-terminal state, with enough
   * info to fetch their current status and fire a notification on → ready.
   */
  activeVideos?: ActiveVideo[]
  /** Poll interval in ms. 15s by default. */
  intervalMs?: number
}

export function SermonListAutoRefresh({
  hasActive,
  activeVideos = [],
  intervalMs = 15_000,
}: Props) {
  const router = useRouter()
  const { addNotification } = useNotifications()

  // Keep a ref so the interval callback always sees the latest list without
  // restarting the interval on every render.
  const activeVideosRef = useRef(activeVideos)
  useEffect(() => { activeVideosRef.current = activeVideos }, [activeVideos])

  // Track last-known status per video ID to detect the → ready transition.
  // Seeded from the server-rendered list so we don't fire on mount for
  // videos that were already in-flight before the component mounted.
  const knownStatuses = useRef<Record<string, VideoStatus>>(
    Object.fromEntries(activeVideos.map(v => [v.id, v.status]))
  )

  useEffect(() => {
    if (!hasActive) return
    const id = setInterval(async () => {
      for (const video of activeVideosRef.current) {
        try {
          const res = await fetch(`/api/videos/${video.id}`)
          if (!res.ok) continue
          const updated: { status: VideoStatus } = await res.json()
          const prev = knownStatuses.current[video.id]
          if (prev !== undefined && prev !== 'ready' && updated.status === 'ready') {
            addNotification({ type: 'video_ready', title: video.title, videoId: video.id })
          }
          knownStatuses.current[video.id] = updated.status
        } catch { /* ignore poll errors */ }
      }
      router.refresh()
    }, intervalMs)
    return () => clearInterval(id)
  }, [hasActive, intervalMs, router, addNotification])

  return null
}
