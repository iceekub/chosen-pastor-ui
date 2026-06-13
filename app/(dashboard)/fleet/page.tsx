import { requireAdmin } from '@/lib/dal'
import {
  getFetchDevices,
  getRecentDeviceFailures,
  getRecentProxyAttempts,
} from '@/lib/api/fetch'
import { FleetList } from '@/components/fleet/fleet-list'
import { ProxyStats } from '@/components/fleet/proxy-stats'
import type { DeviceFailure, FetchDevice, ProxyAttempt } from '@/lib/api/types'

/** How far back the per-device error counts + proxy stats look. */
const ERROR_WINDOW_DAYS = 7

export default async function FleetPage() {
  await requireAdmin()

  let devices: FetchDevice[] = []
  let failures: DeviceFailure[] = []
  let proxyAttempts: ProxyAttempt[] = []
  let loadError: string | null = null
  try {
    ;[devices, failures, proxyAttempts] = await Promise.all([
      getFetchDevices(),
      getRecentDeviceFailures(ERROR_WINDOW_DAYS),
      getRecentProxyAttempts(ERROR_WINDOW_DAYS),
    ])
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e)
  }

  const failuresByDevice: Record<string, DeviceFailure[]> = {}
  for (const f of failures) {
    ;(failuresByDevice[f.device_id] ??= []).push(f)
  }

  return (
    <div className="px-8 py-9 max-w-6xl mx-auto">
      <div className="mb-8 anim-fadeUp">
        <h1
          className="text-4xl leading-tight"
          style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F', fontStyle: 'italic' }}
        >
          Fleet.
        </h1>
        <p className="text-sm mt-1" style={{ color: '#7A6A58', fontFamily: 'var(--font-mulish)' }}>
          Raspberry Pi download devices at partner homes — Chosen team only. Error counts cover
          the last {ERROR_WINDOW_DAYS} days; reload for current status.
        </p>
      </div>

      {loadError && (
        <div className="mb-4 p-4 rounded bg-red-50 border border-red-200 text-red-700 text-sm font-mono break-all">
          API error: {loadError}
        </div>
      )}

      <div className="space-y-4">
        <ProxyStats attempts={proxyAttempts} windowDays={ERROR_WINDOW_DAYS} />
        <FleetList devices={devices} failuresByDevice={failuresByDevice} />
      </div>
    </div>
  )
}
