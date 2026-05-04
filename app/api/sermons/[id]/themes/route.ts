/**
 * Route handler for tagging a sermon with themes.
 *
 * - POST    { theme_id }              → tag the video with the theme
 * - DELETE  ?theme_id=<uuid>          → remove that tag
 *
 * Both proxy to PostgREST. RLS gates writes to staff/pastor in the
 * row's church.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { tagVideoWithTheme, untagVideoFromTheme } from '@/lib/api/themes'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { theme_id } = (await request.json()) as { theme_id?: string }
  if (!theme_id) return NextResponse.json({ error: 'theme_id required' }, { status: 400 })

  try {
    const row = await tagVideoWithTheme(id, theme_id)
    return NextResponse.json(row)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to tag' },
      { status: 502 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const theme_id = request.nextUrl.searchParams.get('theme_id')
  if (!theme_id) return NextResponse.json({ error: 'theme_id required' }, { status: 400 })

  try {
    await untagVideoFromTheme(id, theme_id)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to untag' },
      { status: 502 },
    )
  }
}
