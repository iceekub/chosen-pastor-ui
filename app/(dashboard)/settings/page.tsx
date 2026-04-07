import { verifySession } from '@/lib/dal'
import { SettingsForm } from '@/components/settings-form'

export default async function SettingsPage() {
  const user = await verifySession()
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
          Manage your church profile and contact information.
        </p>
      </div>
      <SettingsForm user={user} />
    </div>
  )
}
