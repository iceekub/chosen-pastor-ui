import { verifySession } from '@/lib/dal'
import { getChurch, getBibleVersions } from '@/lib/api/churches'
import { listStaff } from '@/lib/api/staff'
import { SettingsForm } from '@/components/settings-form'
import { InviteStaffForm } from '@/components/invite-staff-form'

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

      <SettingsForm user={user} church={church} bibleVersions={bibleVersions} />

      {/* ── Team ── */}
      <div className="mt-8 space-y-6 anim-fadeUp" style={{ animationDelay: '0.32s' }}>
        <div className="surface px-6 py-6">
          <p className="section-label mb-1">Team</p>
          <p className="text-xs mb-5" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
            Invite team members. They&rsquo;ll receive a magic-link to set their password.
          </p>
          <InviteStaffForm />
        </div>

        {team.length > 0 && (
          <div className="surface px-6 py-6 anim-fadeUp" style={{ animationDelay: '0.38s' }}>
            <p className="section-label mb-4">Current team</p>
            <ul className="divide-y" style={{ borderColor: 'rgba(200,182,155,0.3)' }}>
              {team.map((person) => (
                <li key={person.id} className="py-3">
                  <p className="text-sm font-medium" style={{ color: '#2C1E0F', fontFamily: 'var(--font-mulish)' }}>
                    {person.name}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
