/**
 * Test factories for Chosen schema types. Use these to keep test
 * fixtures in sync as the schema evolves.
 */

import type {
  AttemptWithDevice,
  DeletionRequest,
  DownloadVideoRow,
  FetchDevice,
  Garden,
  GardenContent,
  GardenListItem,
  JobEmbed,
  Video,
  VideoDownloadAttempt,
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
    custom_thumbnail_url: null,
    thumbnail_keys: [],
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

export function makeDownloadAttempt(
  overrides: Partial<VideoDownloadAttempt> = {},
): VideoDownloadAttempt {
  return {
    id: 'a1',
    video_id: 'v1',
    attempt_number: 1,
    url: 'https://www.youtube.com/watch?v=fake',
    outcome: 'succeeded',
    kind: null,
    http_status: null,
    error_message: null,
    ip_family: 'ipv6',
    egress_ip: '2600:1f1c:dead::1',
    yt_dlp_version: '2026.05.01',
    ecs_task_id: 'task-aaaa1111',
    device_id: null,
    fetch_job_id: null,
    route: null,
    downloaded_bytes: null,
    started_at: '2026-05-17T12:00:00Z',
    finished_at: '2026-05-17T12:00:30Z',
    ...overrides,
  }
}

// ─── Fetch fleet (Downloads + Fleet dashboards) ──────────────────────

/** A fetch attempt as embedded on the Downloads spine (device name joined). */
export function makeAttemptWithDevice(
  overrides: Partial<AttemptWithDevice> = {},
): AttemptWithDevice {
  return {
    ...makeDownloadAttempt(),
    device: null,
    ...overrides,
  }
}

/** A fetch_jobs row as embedded on the Downloads spine. */
export function makeJobEmbed(overrides: Partial<JobEmbed> = {}): JobEmbed {
  return {
    id: 'fj1',
    status: 'pending',
    progress: null,
    attempt_count: 0,
    max_devices: 2,
    bulk_import_item_id: null,
    error_kind: null,
    error_message: null,
    claimed_at: null,
    created_at: '2026-06-12T10:00:00Z',
    finished_at: null,
    claimed_device: null,
    bulk_item: null,
    ...overrides,
  }
}

/** One video row on the Downloads page (downloading, nothing embedded yet). */
export function makeDownloadRow(
  overrides: Partial<DownloadVideoRow> = {},
): DownloadVideoRow {
  return {
    id: 'v1',
    title: 'Sunday Service — June 8',
    church_id: 'c1',
    status: 'downloading',
    error_message: null,
    created_at: '2026-06-12T10:00:00Z',
    updated_at: '2026-06-12T10:00:00Z',
    churches: { name: 'Demo Church' },
    video_download_attempts: [],
    fetch_jobs: [],
    ...overrides,
  }
}

export function makeFetchDevice(overrides: Partial<FetchDevice> = {}): FetchDevice {
  return {
    id: 'd1',
    name: 'fetcher-01',
    token_prefix: 'fd_abc12',
    enabled: true,
    status: 'active',
    cooldown_until: null,
    last_seen_at: '2026-06-12T10:00:00Z',
    last_job_finished_at: null,
    consecutive_block_failures: 0,
    agent_version: '20260612-abc1234',
    ytdlp_version: '2026.03.17',
    last_ip: '203.0.113.7',
    disk_free_gb: 96.4,
    notes: null,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: null,
    ...overrides,
  }
}

export function makeDeletionRequest(
  overrides: Partial<DeletionRequest> = {},
): DeletionRequest {
  return {
    id: 'dr1',
    email: 'member@example.com',
    profile_id: 'p1',
    church_id: 'c1',
    reason: null,
    source: 'web',
    status: 'pending',
    notes: null,
    reviewed_by: null,
    reviewed_at: null,
    completed_at: null,
    created_at: '2026-06-19T12:00:00Z',
    updated_at: null,
    matched_profile: { name: 'Pat Member', role: 'parishioner' },
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
