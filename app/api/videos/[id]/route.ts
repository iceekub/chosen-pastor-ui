/**
 * Route handler: GET + PATCH /api/videos/[id]
 * GET  — proxies to backend GET /videos/{id} (client-side status polling).
 * PATCH — updates title (PostgREST) or video_date (ragserv, recalculates
 *         week_anchor_sunday and re-runs auto-promote).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getVideo, setVideoRole } from '@/lib/api/videos'
import { postgrest } from '@/lib/api/client'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const video = await getVideo(id)
    return NextResponse.json(video)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch video'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json() as { title?: string; video_date?: string }

  try {
    // Title — plain PostgREST PATCH (no pipeline side-effects).
    if (body.title !== undefined) {
      await postgrest(`/videos?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: { title: body.title },
      })
    }
    // Date — goes through ragserv so week_anchor_sunday is recomputed
    // and auto-promote logic re-runs.
    if (body.video_date !== undefined) {
      await setVideoRole(id, undefined, body.video_date)
    }
    const updated = await getVideo(id)
    return NextResponse.json(updated)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update video'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
