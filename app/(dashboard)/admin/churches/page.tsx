import Link from 'next/link'
import { requireAdmin } from '@/lib/dal'
import { listAllChurches } from '@/lib/api/admin'

const TIMEZONE_LABELS: Record<string, string> = {
  'America/New_York': 'Eastern',
  'America/Chicago': 'Central',
  'America/Denver': 'Mountain',
  'America/Phoenix': 'Mountain (AZ)',
  'America/Los_Angeles': 'Pacific',
  'America/Anchorage': 'Alaska',
  'Pacific/Honolulu': 'Hawaii',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function ChurchesPage() {
  await requireAdmin()
  const churches = await listAllChurches()

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      <div className="mb-6 anim-fadeUp">
        <h1 className="page-title">Churches</h1>
        <p className="text-sm mt-1" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
          {churches.length} church{churches.length !== 1 ? 'es' : ''} on the platform
        </p>
      </div>

      <div className="surface anim-fadeUp overflow-hidden" style={{ animationDelay: '0.06s' }}>
        {churches.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
              No churches yet. <Link href="/admin" className="underline" style={{ color: '#B8874A' }}>Add the first one.</Link>
            </p>
          </div>
        ) : (
          <table className="w-full text-sm" style={{ fontFamily: 'var(--font-mulish)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(200,182,155,0.25)' }}>
                {['Church', 'Location', 'Timezone', 'Contact', 'Added'].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-semibold"
                    style={{ color: '#A09080', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {churches.map((church, i) => (
                <tr
                  key={church.id}
                  style={{
                    borderBottom: i < churches.length - 1 ? '1px solid rgba(200,182,155,0.15)' : 'none',
                  }}
                >
                  <td className="px-6 py-4">
                    <p className="font-semibold" style={{ color: '#2C1E0F' }}>{church.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#C5B49A' }}>{church.id}</p>
                  </td>
                  <td className="px-6 py-4" style={{ color: '#6A5040' }}>
                    {[church.city, church.state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-6 py-4" style={{ color: '#6A5040' }}>
                    {church.timezone ? (TIMEZONE_LABELS[church.timezone] ?? church.timezone) : '—'}
                  </td>
                  <td className="px-6 py-4" style={{ color: '#6A5040' }}>
                    {church.contact_email ?? '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap" style={{ color: '#A09080' }}>
                    {formatDate(church.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
