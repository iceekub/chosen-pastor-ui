/**
 * Route handler: POST /api/upload/presign
 *
 * Creates a video record on the backend and returns the presigned S3 URL.
 * Body: { title: string, description?: string, video_date?: string }
 *
 * `video_date` (YYYY-MM-DD) is the sermon's calendar date — defaults
 * to today server-side when omitted. A Sunday-dated upload to a week
 * with no existing primary auto-promotes to role='primary'; the
 * caller doesn't need to do anything special for that to fire.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createVideo } from '@/lib/api/videos'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { title, description, video_date } = body as {
    title: string
    description?: string
    video_date?: string
  }

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  try {
    const data = await createVideo(title, description, undefined, video_date)
    return NextResponse.json({
      presigned_upload_url: data.presigned_upload_url,
      video_id: data.id,
      video_date: data.video_date,
      role: data.role,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create video'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
