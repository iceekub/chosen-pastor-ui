/**
 * Route handler: POST /api/videos/youtube
 *
 * Creates a video from a YouTube/Facebook URL — ragserv enqueues the
 * Celery download job and returns a row with status='downloading'.
 * Body: { youtube_url, title?, description?, video_date? }
 *
 * Mirrors `app/api/upload/presign/route.ts` (the direct-file flow).
 * On terminal download failure the sermon-detail page surfaces a
 * "use direct upload instead" CTA pointing back at `/sermons/upload`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import { createYouTubeVideo } from '@/lib/api/videos'

export async function POST(request: NextRequest) {
  let user: Awaited<ReturnType<typeof verifySession>>
  try {
    user = await verifySession()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { youtube_url, title, description, video_date } = body as {
    youtube_url?: string
    title?: string
    description?: string
    video_date?: string
  }

  if (!youtube_url) {
    return NextResponse.json(
      { error: 'youtube_url is required' },
      { status: 400 },
    )
  }

  try {
    const video = await createYouTubeVideo(
      youtube_url,
      title,
      video_date,
      description,
      user.church_id ?? undefined,
    )
    return NextResponse.json({
      video_id: video.id,
      status: video.status,
      title: video.title,
      role: video.role,
      video_date: video.video_date,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create video'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
