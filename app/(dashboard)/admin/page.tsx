import { requireAdmin } from '@/lib/dal'
import { CreateChurchForm } from '@/components/create-church-form'

export default async function AdminPage() {
  await requireAdmin()

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <div className="mb-6 anim-fadeUp">
        <h1 className="page-title">Add a Church</h1>
        <p className="text-sm mt-1" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
          Chosen team only — provision a new church on the platform.
        </p>
      </div>

      <div className="surface px-6 py-6 anim-fadeUp" style={{ animationDelay: '0.06s' }}>
        <CreateChurchForm />
      </div>
    </div>
  )
}
