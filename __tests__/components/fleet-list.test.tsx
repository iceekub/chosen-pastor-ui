vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FleetList } from '@/components/fleet/fleet-list'
import { makeFetchDevice } from '../factories'
import type { DeviceFailure } from '@/lib/api/types'

const failure: DeviceFailure = {
  id: 'f1',
  device_id: 'd1',
  kind: 'IP_BLOCKED',
  http_status: 403,
  error_message: 'ERROR: Sign in to confirm',
  egress_ip: '203.0.113.7',
  started_at: new Date().toISOString(),
  finished_at: new Date().toISOString(),
  video: { id: 'v1', title: 'Sunday Service' },
}

describe('<FleetList />', () => {
  it('shows the empty state when no devices are registered', () => {
    render(<FleetList devices={[]} failuresByDevice={{}} />)
    expect(screen.getByText(/No devices registered/)).toBeInTheDocument()
  })

  it('renders status badges, with enabled=false forcing Disabled', () => {
    render(
      <FleetList
        devices={[
          makeFetchDevice({ id: 'd1', name: 'fetcher-01', status: 'active' }),
          makeFetchDevice({ id: 'd2', name: 'fetcher-02', status: 'cooling' }),
          makeFetchDevice({ id: 'd3', name: 'fetcher-03', status: 'offline' }),
          makeFetchDevice({
            id: 'd4',
            name: 'fetcher-04',
            // Stale 'active' status + kill switch → Disabled wins.
            status: 'active',
            enabled: false,
          }),
        ]}
        failuresByDevice={{}}
      />,
    )
    expect(screen.getByText('Online')).toBeInTheDocument()
    expect(screen.getByText('Cooling down')).toBeInTheDocument()
    expect(screen.getByText('Offline')).toBeInTheDocument()
    expect(screen.getByText('Disabled')).toBeInTheDocument()
    // Summary strip counts.
    expect(screen.getByText('1 online')).toBeInTheDocument()
    expect(screen.getByText('1 disabled')).toBeInTheDocument()
  })

  it('renders "Never" for a device that has not phoned home', () => {
    render(
      <FleetList
        devices={[makeFetchDevice({ last_seen_at: null })]}
        failuresByDevice={{}}
      />,
    )
    expect(screen.getByText('Never')).toBeInTheDocument()
  })

  it('shows versions, disk, and the 7d error count', () => {
    render(
      <FleetList
        devices={[makeFetchDevice({ id: 'd1' })]}
        failuresByDevice={{ d1: [failure] }}
      />,
    )
    expect(screen.getByText('20260612-abc1234')).toBeInTheDocument()
    expect(screen.getByText(/yt-dlp 2026\.03\.17/)).toBeInTheDocument()
    expect(screen.getByText('96.4 GB')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument() // errors 7d
  })

  it('expanding a device reveals its failure drill-in', () => {
    render(
      <FleetList
        devices={[makeFetchDevice({ id: 'd1', name: 'fetcher-01' })]}
        failuresByDevice={{ d1: [failure] }}
      />,
    )
    expect(screen.queryByText(/Sign in to confirm/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /fetcher-01/ }))
    expect(screen.getByText('IP_BLOCKED')).toBeInTheDocument()
    expect(screen.getByText(/HTTP 403/)).toBeInTheDocument()
    expect(screen.getByText(/Sign in to confirm/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sunday Service' })).toBeInTheDocument()
  })

  it('expanded device with a clean week says so', () => {
    render(
      <FleetList
        devices={[makeFetchDevice({ id: 'd1', name: 'fetcher-01' })]}
        failuresByDevice={{}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /fetcher-01/ }))
    expect(screen.getByText(/No failures in the last 7 days/)).toBeInTheDocument()
  })
})
