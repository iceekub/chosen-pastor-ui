/**
 * Route handler: POST /api/page-imports/queue
 *
 * Proxies to ragserv: create + dispatch the selected video URLs through
 * the fetch fleet. Body: { video_urls: string[], page_url? }.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { queuePageVideos } from '@/lib/api/pageImports'
import { ApiError } from '@/lib/api/client'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const videoUrls = (body as { video_urls?: unknown }).video_urls
  if (!Array.isArray(videoUrls) || videoUrls.length === 0) {
    return NextResponse.json(
      { error: 'video_urls must be a non-empty array' },
      { status: 400 },
    )
  }
  const pageUrl = (body as { page_url?: string }).page_url

  try {
    const result = await queuePageVideos(videoUrls as string[], pageUrl)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    const message = err instanceof Error ? err.message : 'Failed to queue videos'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
