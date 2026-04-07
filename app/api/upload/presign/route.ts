/**
 * Route handler: GET /api/upload/presign?filename=...&content_type=...
 *
 * Calls the Chosen backend to get a pre-signed S3 upload URL.
 * Keeps the auth token server-side — the browser never sees it.
 *
 * PLACEHOLDER: swap the body of requestPresignedUpload() in lib/api/sermons.ts
 * when the Chosen team provides the real endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { requestPresignedUpload } from '@/lib/api/sermons'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const filename = searchParams.get('filename')
  const content_type = searchParams.get('content_type')

  if (!filename || !content_type) {
    return NextResponse.json(
      { error: 'filename and content_type are required' },
      { status: 400 }
    )
  }

  try {
    const data = await requestPresignedUpload(filename, content_type)
    return NextResponse.json(data)
  } catch {
    // PLACEHOLDER: return a fake presigned response in dev so the UI doesn't break
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        upload_url: 'https://placeholder-s3-url.example.com/upload',
        key: `placeholder/${Date.now()}-${filename}`,
        sermon_id: Math.floor(Math.random() * 10000),
      })
    }
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 502 })
  }
}
