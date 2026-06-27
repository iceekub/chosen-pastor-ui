/**
 * Route handler: POST /api/page-imports/discover
 *
 * Proxies to ragserv: scrape a web page for the YouTube/Vimeo videos it
 * links to or embeds. Body: { page_url }. Returns the discovered list.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { discoverPageVideos } from '@/lib/api/pageImports'
import { ApiError } from '@/lib/api/client'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const pageUrl = (body as { page_url?: string }).page_url
  if (!pageUrl || !/^https?:\/\//i.test(pageUrl)) {
    return NextResponse.json({ error: 'page_url must be an http(s) URL' }, { status: 400 })
  }

  try {
    const result = await discoverPageVideos(pageUrl)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof ApiError) {
      // Forwards ragserv's 422 ("Could not fetch page: …") verbatim.
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    const message = err instanceof Error ? err.message : 'Failed to scan page'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
