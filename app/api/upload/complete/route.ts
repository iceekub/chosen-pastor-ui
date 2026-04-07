import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { completeSermonUpload } from '@/lib/api/sermons'
import type { CompleteUploadRequest } from '@/lib/api/types'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as CompleteUploadRequest

  try {
    const sermon = await completeSermonUpload(body)
    return NextResponse.json(sermon)
  } catch {
    // PLACEHOLDER: return success in dev so the UI flow works end-to-end
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ id: body.sermon_id, title: body.title, state: 1 })
    }
    return NextResponse.json({ error: 'Failed to complete upload' }, { status: 502 })
  }
}
