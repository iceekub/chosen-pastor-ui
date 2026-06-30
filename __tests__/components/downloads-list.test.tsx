vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DownloadsList } from '@/components/downloads/downloads-list'
import {
  makeAttemptWithDevice,
  makeDownloadRow,
  makeJobEmbed,
} from '../factories'

const inProgressRow = makeDownloadRow({
  id: 'v-active',
  title: 'Active Sermon',
  fetch_jobs: [
    makeJobEmbed({
      status: 'downloading',
      claimed_device: { name: 'fetcher-01' },
      progress: {
        phase: 'fetching',
        percent: 41,
        downloaded_bytes: 100,
        total_bytes: 200,
        updated_at: new Date().toISOString(),
      },
    }),
  ],
})

const completedRow = makeDownloadRow({
  id: 'v-done',
  title: 'Finished Sermon',
  status: 'ready',
  video_download_attempts: [
    makeAttemptWithDevice({
      outcome: 'succeeded',
      ecs_task_id: 'task-central',
      finished_at: new Date().toISOString(),
    }),
  ],
})

const renderedAt = new Date()

const failedRow = makeDownloadRow({
  id: 'v-failed',
  title: 'Blocked Sermon',
  status: 'error',
  video_download_attempts: [
    makeAttemptWithDevice({
      id: 'fa1',
      outcome: 'failed',
      kind: 'IP_BLOCKED',
      http_status: 403,
      error_message: 'ERROR: Sign in to confirm you are not a bot',
      ecs_task_id: null,
      device_id: 'd1',
      device: { name: 'fetcher-02' },
    }),
  ],
})

describe('<DownloadsList />', () => {
  it('partitions rows into the three sections', () => {
    render(
      <DownloadsList
        rows={[inProgressRow, completedRow, failedRow]}
        isAdmin={false}
        showChurch={false}
        renderedAt={renderedAt}
      />,
    )
    expect(screen.getByText('Active Sermon')).toBeInTheDocument()
    expect(screen.getByText('Finished Sermon')).toBeInTheDocument()
    expect(screen.getByText('Blocked Sermon')).toBeInTheDocument()
    expect(screen.getByText(/Downloading from YouTube — 41%/)).toBeInTheDocument()
  })

  it('staff never see a Box column or device names', () => {
    render(
      <DownloadsList
        rows={[inProgressRow, failedRow]}
        isAdmin={false}
        showChurch={false}
        renderedAt={renderedAt}
      />,
    )
    expect(screen.queryByText('Box')).not.toBeInTheDocument()
    expect(screen.queryByText('fetcher-01')).not.toBeInTheDocument()
  })

  it('admins see box names, including "Central server" for Fargate runs', () => {
    render(
      <DownloadsList
        rows={[inProgressRow, completedRow]}
        isAdmin={true}
        showChurch={false}
        renderedAt={renderedAt}
      />,
    )
    expect(screen.getAllByText('Box').length).toBeGreaterThan(0)
    expect(screen.getByText('fetcher-01')).toBeInTheDocument()
    expect(screen.getByText('Central server')).toBeInTheDocument()
  })

  it('church names render only in the global super_admin view', () => {
    const { rerender } = render(
      <DownloadsList rows={[inProgressRow]} isAdmin={true} showChurch={true} renderedAt={renderedAt} />,
    )
    expect(screen.getByText('Demo Church')).toBeInTheDocument()
    rerender(
      <DownloadsList rows={[inProgressRow]} isAdmin={true} showChurch={false} renderedAt={renderedAt} />,
    )
    expect(screen.queryByText('Demo Church')).not.toBeInTheDocument()
  })

  it('expanding a failed row reveals the explanation + raw error output', () => {
    render(<DownloadsList rows={[failedRow]} isAdmin={false} showChurch={false} renderedAt={renderedAt} />)
    expect(screen.queryByText(/bot detection/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Blocked Sermon/ }))
    expect(screen.getByText(/bot detection/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Sign in to confirm you are not a bot/),
    ).toBeInTheDocument()
    // Staff drill-in has no box/egress columns…
    expect(screen.queryByText('Egress IP')).not.toBeInTheDocument()
  })

  it('admin drill-in shows the per-attempt box + egress columns', () => {
    render(<DownloadsList rows={[failedRow]} isAdmin={true} showChurch={false} renderedAt={renderedAt} />)
    fireEvent.click(screen.getByRole('button', { name: /Blocked Sermon/ }))
    expect(screen.getByText('Egress IP')).toBeInTheDocument()
    expect(screen.getByText('fetcher-02')).toBeInTheDocument()
  })

  it('renders empty states per section', () => {
    render(<DownloadsList rows={[]} isAdmin={false} showChurch={false} renderedAt={renderedAt} />)
    expect(screen.getByText(/Nothing downloading right now/)).toBeInTheDocument()
    expect(screen.getByText(/No downloads finished in this window/)).toBeInTheDocument()
    expect(screen.getByText(/No failures in this window/)).toBeInTheDocument()
  })
})
