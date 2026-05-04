import { verifySession } from '@/lib/dal'
import { getChurch, getBibleVersions } from '@/lib/api/churches'
import { listStaff } from '@/lib/api/staff'
import { SettingsForm } from '@/components/settings-form'

export default async function SettingsPage() {
  const user = await verifySession()

  const [church, bibleVersions, team] = await Promise.all([
    user.church_id ? getChurch(user.church_id).catch(() => null) : null,
    getBibleVersions().catch(() => []),
    listStaff().catch(() => []),
  ])

  return (
    <div className="px-8 py-9 max-w-2xl mx-auto">
      <div className="mb-8 anim-fadeUp">
        <p className="section-label mb-2">Account</p>
        <h1
          className="text-4xl leading-tight"
          style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F', fontStyle: 'italic' }}
        >
          Settings.
        </h1>
        <p className="text-sm mt-1" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
          Manage your church profile and team.
        </p>
      </div>

      <SettingsForm
        user={user}
        church={church}
        bibleVersions={bibleVersions}
        team={team}
      />
    </div>
  )
}
