/**
 * Web-page video import — server-side helpers.
 *
 * Mirrors ragserv's `/page-imports` endpoints. Both calls go through the
 * `ragserv` helper which carries the session bearer. Used by the Next API
 * proxy routes under `app/api/page-imports/`.
 */

import { ragserv } from './client'
import type { PageDiscoverResult, PageQueueResult } from './types'

export async function discoverPageVideos(
  pageUrl: string,
): Promise<PageDiscoverResult> {
  // Scrapes the page (direct egress, not the residential proxy) and
  // returns the YouTube/Vimeo videos it links to or embeds. No DB writes.
  return ragserv<PageDiscoverResult>('/page-imports/discover', {
    method: 'POST',
    body: { page_url: pageUrl },
  })
}

export async function queuePageVideos(
  videoUrls: string[],
  pageUrl?: string,
): Promise<PageQueueResult> {
  // Creates a video row per URL and dispatches it through the fetch fleet
  // (devices → proxy → central), exactly like a single pasted YouTube link.
  return ragserv<PageQueueResult>('/page-imports/queue', {
    method: 'POST',
    body: { video_urls: videoUrls, page_url: pageUrl },
  })
}
