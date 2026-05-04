/**
 * Test factories for Chosen schema types. Use these to keep test
 * fixtures in sync as the schema evolves.
 */

import type {
  Garden,
  GardenContent,
  GardenListItem,
  Video,
  VideoListItem,
} from '@/lib/api/types'

export function makeGardenContent(overrides: Partial<GardenContent> = {}): GardenContent {
  return {
    topic: 'Understanding Grace',
    cards: [
      {
        id: 'c1',
        type: 'verse',
        tag: 'Scripture',
        citation: 'Ephesians 2:8-9',
        content: 'For it is by grace you have been saved.',
      },
      {
        id: 'c2',
        type: 'text',
        tag: 'Reflection',
        content: 'Reflect on grace today.',
      },
    ],
    ...overrides,
  }
}

export function makeGarden(overrides: Partial<Garden> = {}): Garden {
  return {
    id: 'g1',
    video_id: 'v1',
    church_id: 'c1',
    // 2026-04-27 is a Monday — passes the Mon-Sat CHECK.
    garden_date: '2026-04-27',
    topic: 'Understanding Grace',
    content_json: makeGardenContent(),
    status: 'ready',
    error_message: null,
    is_stale: false,
    is_featured: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: null,
    ...overrides,
  }
}

export function makeGardenListItem(overrides: Partial<GardenListItem> = {}): GardenListItem {
  return { ...makeGarden(), ...overrides }
}

export function makeVideo(overrides: Partial<Video> = {}): Video {
  return {
    id: 'v1',
    church_id: 'c1',
    created_by: null,
    title: 'Sample Sermon',
    description: null,
    video_type: 'sermon',
    youtube_url: null,
    s3_key: null,
    thumbnail_url: null,
    // Sunday 2026-04-26 anchors to the same week as the makeGarden
    // factory's 2026-04-27 (Mon) — keeps cross-fixture tests
    // consistent. Sunday-dated → eligible to be primary.
    video_date: '2026-04-26',
    role: 'primary',
    week_anchor_sunday: '2026-04-26',
    duration_seconds: null,
    status: 'ready',
    ragie_document_id: null,
    transcript: null,
    transcript_tokens: null,
    summary: null,
    error_message: null,
    is_featured: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: null,
    ...overrides,
  }
}

export function makeVideoListItem(overrides: Partial<VideoListItem> = {}): VideoListItem {
  return {
    id: 'v1',
    church_id: 'c1',
    title: 'Sample Sermon',
    description: null,
    video_type: 'sermon',
    status: 'ready',
    video_date: '2026-04-26',
    role: 'primary',
    week_anchor_sunday: '2026-04-26',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: null,
    is_featured: false,
    ...overrides,
  }
}
