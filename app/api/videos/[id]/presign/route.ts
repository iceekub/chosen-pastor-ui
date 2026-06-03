/**
 * Route handler: POST /api/videos/[id]/presign
 *
 * Re-issues a presigned upload URL for a video whose first upload never
 * completed (the browser PUT failed, or the original URL expired). Proxies
 * to ragserv POST /videos/{id}/presign, which re-signs the SAME originals
 * key — so the retry overwrites in place rather than creating a new video
 * row. ragserv 409s if the video has already moved past pending_upload.
 *
 * Mirrors /api/upload/presign's response shape so the upload component can
 * treat the retry identically.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { reissueUploadUrl } from '@/lib/api/videos'
import { ApiError } from '@/lib/api/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as { content_type?: string }

  try {
    const data = await reissueUploadUrl(id, body.content_type)
    return NextResponse.json({
      presigned_upload_url: data.presigned_upload_url,
      video_id: data.id,
      video_date: data.video_date,
      role: data.role,
    })
  } catch (err) {
    // Forward ragserv's status (e.g. 409 not_pending_upload, 404) so the
    // client can distinguish "already processing" from a transient failure.
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    const message = err instanceof Error ? err.message : 'Failed to re-issue upload URL'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
