'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  /**
   * True when at least one rendered video is in a non-terminal state
   * (pending_upload / downloading / transcoding / uploaded / processing).
   * The parent page computes this server-side from its current
   * `videos` slice; the component does nothing while it's false.
   */
  hasActive: boolean
  /**
   * Poll interval in ms. 15s by default — short enough that thumbnails
   * and status badges appear promptly after MediaConvert + Ragie
   * finish, long enough that we're not churning during multi-minute
   * transcodes.
   */
  intervalMs?: number
}

/**
 * Triggers `router.refresh()` on a fixed interval while the parent
 * page reports active videos. Because the parent is a server
 * component, `router.refresh()` re-runs the server fetch and
 * re-renders with the new data — no client-side state plumbing
 * required, RLS still enforced via PostgREST.
 *
 * Render-tree impact is zero: this component returns null.
 */
export function SermonListAutoRefresh({ hasActive, intervalMs = 15_000 }: Props) {
  const router = useRouter()

  useEffect(() => {
    if (!hasActive) return
    const id = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(id)
  }, [hasActive, intervalMs, router])

  return null
}
