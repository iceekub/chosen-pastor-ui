import { verifySession } from '@/lib/dal'
import { getChurch, getChurchAssets, getBibleVersions } from '@/lib/api/churches'
import { listStaff } from '@/lib/api/staff'
import { listPastors } from '@/lib/api/pastors'
import { SettingsForm } from '@/components/settings-form'

export default async function SettingsPage() {
  const user = await verifySession()

  const [church, assets, bibleVersions, team, pastors] = await Promise.all([
    user.church_id ? getChurch(user.church_id).catch(() => null) : null,
    user.church_id ? getChurchAssets(user.church_id) : null,
    getBibleVersions().catch(() => []),
    listStaff(user.church_id).catch(() => []),
    listPastors().catch(() => []),
  ])

  // Merge asset URLs (from PostgREST) onto the church record (from ragserv),
  // since ragserv may not return logo_url / image_url fields.
  const churchWithAssets = church && assets ? { ...church, ...assets } : church

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
        church={churchWithAssets}
        bibleVersions={bibleVersions}
        team={team}
        pastors={pastors}
      />
    </div>
  )
}
