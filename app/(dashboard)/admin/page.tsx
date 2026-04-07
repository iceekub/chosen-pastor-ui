import { requireAdmin } from '@/lib/dal'
import { CreateChurchForm } from '@/components/create-church-form'
import { SwitchChurchForm } from '@/components/switch-church-form'

export default async function AdminPage() {
  await requireAdmin()

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Super Admin</h1>
        <p className="text-stone-500 mt-1 text-sm">
          Chosen staff only — manage church onboarding and impersonation.
        </p>
      </div>

      <div className="space-y-6">
        <section className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="text-base font-semibold text-stone-800 mb-4">Switch to a Church</h2>
          <SwitchChurchForm />
        </section>

        <section className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="text-base font-semibold text-stone-800 mb-4">Onboard New Church</h2>
          <CreateChurchForm />
        </section>
      </div>
    </div>
  )
}
