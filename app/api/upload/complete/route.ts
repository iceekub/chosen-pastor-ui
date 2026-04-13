/**
 * Route handler: POST /api/upload/complete
 *
 * Notifies the backend that the S3 upload is done, triggering processing.
 * Body: { video_id: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { completeUpload } from '@/lib/api/videos'
import { TRIGGER_UPLOAD_COMPLETE } from '@/lib/config'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!TRIGGER_UPLOAD_COMPLETE) {
    return NextResponse.json({ skipped: true, message: 'Manual trigger disabled' })
  }

  const { video_id } = (await request.json()) as { video_id: string }

  if (!video_id) {
    return NextResponse.json({ error: 'video_id is required' }, { status: 400 })
  }

  try {
    const video = await completeUpload(video_id)
    return NextResponse.json(video)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to complete upload'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
