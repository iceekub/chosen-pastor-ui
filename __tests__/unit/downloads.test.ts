/**
 * deriveDownloadRow — the branchy core of the Downloads dashboard.
 * Every state the UI can render is pinned here against factory rows.
 */

import { describe, it, expect } from 'vitest'
import { deriveDownloadRow, explainKind, stepLabelFor, KIND_EXPLANATIONS } from '@/lib/downloads'
import {
  makeAttemptWithDevice,
  makeDownloadRow,
  makeJobEmbed,
} from '../factories'

const NOW = new Date('2026-06-12T12:00:00Z')

describe('deriveDownloadRow — active spine (video downloading)', () => {
  it('device job with progress → in_progress with phase label + percent', () => {
    const row = makeDownloadRow({
      fetch_jobs: [
        makeJobEmbed({
          status: 'downloading',
          claimed_device: { name: 'fetcher-01' },
          progress: {
            phase: 'fetching',
            percent: 62.4,
            downloaded_bytes: 1000,
            total_bytes: 2000,
            updated_at: '2026-06-12T11:59:00Z',
          },
        }),
      ],
    })
    const d = deriveDownloadRow(row, NOW)
    expect(d.state).toBe('in_progress')
    expect(d.source).toBe('device')
    expect(d.deviceName).toBe('fetcher-01')
    expect(d.stepLabel).toBe('Downloading from YouTube')
    expect(d.percent).toBe(62.4)
    expect(d.progressStale).toBe(false)
  })

  it('merging/uploading phases get their own labels; claimed gets assigned copy', () => {
    expect(
      stepLabelFor(makeJobEmbed({ status: 'downloading', progress: { phase: 'merging', percent: null, downloaded_bytes: null, total_bytes: null, updated_at: 'x' } })),
    ).toBe('Merging audio + video')
    expect(stepLabelFor(makeJobEmbed({ status: 'uploading' }))).toBe('Uploading to storage')
    expect(stepLabelFor(makeJobEmbed({ status: 'claimed' }))).toBe('Assigned to a device')
    expect(stepLabelFor(makeJobEmbed({ status: 'downloading', progress: null }))).toBe('Downloading')
  })

  it('flags stale progress (> 5 min old)', () => {
    const row = makeDownloadRow({
      fetch_jobs: [
        makeJobEmbed({
          status: 'downloading',
          progress: {
            phase: 'fetching',
            percent: 10,
            downloaded_bytes: null,
            total_bytes: null,
            updated_at: '2026-06-12T11:40:00Z', // 20 min before NOW
          },
        }),
      ],
    })
    expect(deriveDownloadRow(row, NOW).progressStale).toBe(true)
  })

  it('staff see no device name (RLS nulls the embed)', () => {
    const row = makeDownloadRow({
      fetch_jobs: [makeJobEmbed({ status: 'downloading', claimed_device: null })],
    })
    const d = deriveDownloadRow(row, NOW)
    expect(d.source).toBe('device')
    expect(d.deviceName).toBeNull()
  })

  it('central route → in_progress via the in-flight attempt', () => {
    const row = makeDownloadRow({
      video_download_attempts: [
        makeAttemptWithDevice({ outcome: 'in_progress', ecs_task_id: 'task-1', finished_at: null }),
      ],
    })
    const d = deriveDownloadRow(row, NOW)
    expect(d.state).toBe('in_progress')
    expect(d.source).toBe('central')
    expect(d.stepLabel).toBe('Downloading from YouTube')
    expect(d.percent).toBeNull()
  })

  it('device attempt open with its job already gone → still in_progress on device', () => {
    const row = makeDownloadRow({
      video_download_attempts: [
        makeAttemptWithDevice({
          outcome: 'in_progress',
          ecs_task_id: null,
          device_id: 'd1',
          device: { name: 'fetcher-02' },
          finished_at: null,
        }),
      ],
    })
    const d = deriveDownloadRow(row, NOW)
    expect(d.state).toBe('in_progress')
    expect(d.deviceName).toBe('fetcher-02')
  })

  it('pending job → queued; cancellable; retry note appears after failures', () => {
    const fresh = deriveDownloadRow(
      makeDownloadRow({ fetch_jobs: [makeJobEmbed({ status: 'pending' })] }),
      NOW,
    )
    expect(fresh.state).toBe('queued')
    expect(fresh.queuedNote).toBeNull()
    expect(fresh.cancelJobId).toBe('fj1')

    const retrying = deriveDownloadRow(
      makeDownloadRow({
        fetch_jobs: [makeJobEmbed({ status: 'pending', attempt_count: 1 })],
      }),
      NOW,
    )
    expect(retrying.queuedNote).toBe('retrying — 1 earlier attempt failed')
  })

  it('job done but video still downloading → "Finishing up"', () => {
    const d = deriveDownloadRow(
      makeDownloadRow({ fetch_jobs: [makeJobEmbed({ status: 'done' })] }),
      NOW,
    )
    expect(d.state).toBe('in_progress')
    expect(d.stepLabel).toBe('Finishing up')
  })

  it('job failed while video downloading → failed with retry handle', () => {
    const row = makeDownloadRow({
      fetch_jobs: [
        makeJobEmbed({ status: 'failed', error_kind: 'IP_BLOCKED', error_message: 'blocked' }),
      ],
    })
    const d = deriveDownloadRow(row, NOW)
    expect(d.state).toBe('failed')
    expect(d.retryJobId).toBe('fj1')
    expect(d.failure?.kind).toBe('IP_BLOCKED')
    expect(d.failure?.explanation).toBe(KIND_EXPLANATIONS.IP_BLOCKED)
  })

  it('cancelled job → cancelled state', () => {
    const d = deriveDownloadRow(
      makeDownloadRow({ fetch_jobs: [makeJobEmbed({ status: 'cancelled' })] }),
      NOW,
    )
    expect(d.state).toBe('cancelled')
    expect(d.retryJobId).toBe('fj1')
  })

  it('no job, no attempts → queued ("waiting to start")', () => {
    const d = deriveDownloadRow(makeDownloadRow(), NOW)
    expect(d.state).toBe('queued')
    expect(d.queuedNote).toBe('waiting to start')
  })

  it('multiple job rows → the newest wins', () => {
    const row = makeDownloadRow({
      fetch_jobs: [
        makeJobEmbed({ id: 'old', status: 'failed', created_at: '2026-06-12T09:00:00Z' }),
        makeJobEmbed({ id: 'new', status: 'pending', created_at: '2026-06-12T11:00:00Z' }),
      ],
    })
    const d = deriveDownloadRow(row, NOW)
    expect(d.state).toBe('queued')
    expect(d.cancelJobId).toBe('new')
  })
})

describe('deriveDownloadRow — history spine', () => {
  it('succeeded attempt → completed with finish time + source', () => {
    const row = makeDownloadRow({
      status: 'ready',
      video_download_attempts: [
        makeAttemptWithDevice({
          outcome: 'succeeded',
          ecs_task_id: null,
          device_id: 'd1',
          device: { name: 'fetcher-01' },
          finished_at: '2026-06-12T11:30:00Z',
        }),
      ],
    })
    const d = deriveDownloadRow(row, NOW)
    expect(d.state).toBe('completed')
    expect(d.completedAt).toBe('2026-06-12T11:30:00Z')
    expect(d.source).toBe('device')
    expect(d.deviceName).toBe('fetcher-01')
    expect(d.laterFailure).toBe(false)
  })

  it('download succeeded but the pipeline failed later → laterFailure', () => {
    const row = makeDownloadRow({
      status: 'error',
      video_download_attempts: [
        makeAttemptWithDevice({ outcome: 'succeeded', finished_at: '2026-06-12T11:30:00Z' }),
      ],
    })
    const d = deriveDownloadRow(row, NOW)
    expect(d.state).toBe('completed')
    expect(d.laterFailure).toBe(true)
  })

  it('failed video → headline from the LAST failed attempt', () => {
    const row = makeDownloadRow({
      status: 'error',
      video_download_attempts: [
        makeAttemptWithDevice({
          id: 'a1', attempt_number: 1, outcome: 'failed',
          kind: 'NETWORK', started_at: '2026-06-12T10:00:00Z',
        }),
        makeAttemptWithDevice({
          id: 'a2', attempt_number: 2, outcome: 'failed',
          kind: 'IP_BLOCKED', http_status: 403,
          error_message: 'Sign in to confirm', started_at: '2026-06-12T11:00:00Z',
        }),
      ],
    })
    const d = deriveDownloadRow(row, NOW)
    expect(d.state).toBe('failed')
    expect(d.failure?.kind).toBe('IP_BLOCKED')
    expect(d.failure?.httpStatus).toBe(403)
    expect(d.failure?.message).toBe('Sign in to confirm')
  })

  it('failed video with zero attempts → falls back to video.error_message', () => {
    const row = makeDownloadRow({
      status: 'error',
      error_message: 'Download failed.',
    })
    const d = deriveDownloadRow(row, NOW)
    expect(d.state).toBe('failed')
    expect(d.failure?.message).toBe('Download failed.')
    expect(d.failure?.explanation).toBe(KIND_EXPLANATIONS.OTHER)
  })

  it('progressed video whose attempts aged out → defensive completed', () => {
    const d = deriveDownloadRow(makeDownloadRow({ status: 'ready' }), NOW)
    expect(d.state).toBe('completed')
    expect(d.completedAt).toBe('2026-06-12T10:00:00Z')
  })

  it('bulk-import linkage resolves through the embed', () => {
    const row = makeDownloadRow({
      fetch_jobs: [makeJobEmbed({ bulk_item: { job_id: 'bulk-9' } })],
    })
    expect(deriveDownloadRow(row, NOW).bulkImportJobId).toBe('bulk-9')
  })
})

describe('explainKind', () => {
  it('maps every known kind and falls back to OTHER copy', () => {
    expect(explainKind('IP_BLOCKED')).toMatch(/bot detection/i)
    expect(explainKind('DEVICE_LOST')).toMatch(/went offline/i)
    expect(explainKind('SOMETHING_NOVEL')).toBe(KIND_EXPLANATIONS.OTHER)
    expect(explainKind(null)).toBe(KIND_EXPLANATIONS.OTHER)
  })
})

describe('route attribution (proxy era)', () => {
  it('explicit route column wins; heuristic covers historical rows', () => {
    const row = makeDownloadRow({
      video_download_attempts: [
        makeAttemptWithDevice({
          outcome: 'in_progress',
          finished_at: null,
          // Proxy attempts run on the ECS worker, so ecs_task_id is
          // set — only the route column tells the truth.
          ecs_task_id: 'task-1',
          route: 'proxy',
        }),
      ],
    })
    const d = deriveDownloadRow(row, NOW)
    expect(d.state).toBe('in_progress')
    expect(d.source).toBe('proxy')
  })

  it('completed via proxy is attributed to the proxy', () => {
    const row = makeDownloadRow({
      status: 'ready',
      video_download_attempts: [
        makeAttemptWithDevice({
          outcome: 'succeeded',
          ecs_task_id: 'task-1',
          route: 'proxy',
          downloaded_bytes: 500_000_000,
          finished_at: '2026-06-12T11:00:00Z',
        }),
      ],
    })
    const d = deriveDownloadRow(row, NOW)
    expect(d.state).toBe('completed')
    expect(d.source).toBe('proxy')
  })

  it('failed proxy attempts attribute the failure to the proxy', () => {
    const row = makeDownloadRow({
      status: 'error',
      video_download_attempts: [
        makeAttemptWithDevice({
          outcome: 'failed',
          kind: 'IP_BLOCKED',
          ecs_task_id: 'task-1',
          route: 'proxy',
        }),
      ],
    })
    expect(deriveDownloadRow(row, NOW).source).toBe('proxy')
  })

  it('null-route historical rows fall back to the device/central heuristic', () => {
    const central = makeDownloadRow({
      status: 'ready',
      video_download_attempts: [
        makeAttemptWithDevice({ outcome: 'succeeded', ecs_task_id: 'task-1', route: null }),
      ],
    })
    expect(deriveDownloadRow(central, NOW).source).toBe('central')
  })
})
