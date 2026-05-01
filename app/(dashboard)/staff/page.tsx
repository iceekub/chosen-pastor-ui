import { listStaff } from '@/lib/api/staff'
import { verifySession } from '@/lib/dal'
import { InviteStaffForm } from '@/components/invite-staff-form'

export default async function StaffPage() {
  await verifySession()
  const staff = await listStaff().catch(() => [])

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Team</h1>
        <p className="text-stone-500 mt-1 text-sm">
          Invite team members. Invitees receive a magic-link email and set their own password.
        </p>
      </div>

      <section className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
        <h2 className="text-base font-semibold text-stone-800 mb-4">Invite</h2>
        <InviteStaffForm />
      </section>

      <section className="bg-white rounded-xl border border-stone-200 p-6">
        <h2 className="text-base font-semibold text-stone-800 mb-4">Current team</h2>
        {staff.length === 0 ? (
          <p className="text-sm text-stone-500">No team members yet.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {staff.map((person) => (
              <li key={person.id} className="py-3">
                <p className="text-sm font-medium text-stone-800">{person.name}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
