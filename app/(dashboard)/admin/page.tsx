import { requireAdmin } from '@/lib/dal'
import { CreateChurchForm } from '@/components/create-church-form'

export default async function AdminPage() {
  await requireAdmin()

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Super Admin</h1>
        <p className="text-stone-500 mt-1 text-sm">
          Chosen team only — manage church onboarding.
        </p>
      </div>

      <div className="space-y-6">
        <section className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="text-base font-semibold text-stone-800 mb-4">Onboard New Church</h2>
          <CreateChurchForm />
        </section>

        {/* Note: a super_admin's JWT lets them read/edit any church via RLS;
            no church-switching step is needed here. A future church-picker
            UI for browsing across churches can go in this section. */}
      </div>
    </div>
  )
}
