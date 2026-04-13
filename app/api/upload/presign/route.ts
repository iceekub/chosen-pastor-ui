/**
 * Route handler: POST /api/upload/presign
 *
 * Creates a video record on the backend and returns the presigned S3 URL.
 * Body: { title: string, description?: string }
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
  const { title, description } = body as { title: string; description?: string }

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  try {
    const data = await createVideo(title, description)
    return NextResponse.json({
      presigned_upload_url: data.presigned_upload_url,
      video_id: data.id,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create video'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
