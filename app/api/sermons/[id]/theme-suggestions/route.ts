/**
 * Route handler for the LLM clip-theme suggestions on a sermon.
 *
 * - GET → returns ragserv's nested clip-suggestion shape:
 *   [{ clip_id, start_time, end_time, summary, suggested_at,
 *      themes: [{ theme_id, theme_name, confidence }] }]
 *
 * Pure proxy. ragserv enforces the staff-only check (parishioner
 * JWTs receive 403 from ragserv directly).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getThemeSuggestionsForVideo } from '@/lib/api/themes'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const suggestions = await getThemeSuggestionsForVideo(id)
    return NextResponse.json(suggestions)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch theme suggestions' },
      { status: 502 },
    )
  }
}
