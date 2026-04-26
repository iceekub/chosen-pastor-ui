import { listThemes } from '@/lib/api/themes'
import { verifySession } from '@/lib/dal'
import { ThemeCreateForm } from '@/components/theme-create-form'
import { deleteThemeAction } from '@/app/actions/themes'

export default async function ThemesPage() {
  await verifySession()
  const themes = await listThemes().catch(() => [])

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Themes</h1>
        <p className="text-stone-500 mt-1 text-sm">
          Group sermons under named themes (Faith, Forgiveness, etc.).
          Tag sermons with themes from each sermon&rsquo;s detail page.
        </p>
      </div>

      <section className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
        <h2 className="text-base font-semibold text-stone-800 mb-4">New theme</h2>
        <ThemeCreateForm />
      </section>

      <section className="bg-white rounded-xl border border-stone-200 p-6">
        <h2 className="text-base font-semibold text-stone-800 mb-4">Existing themes</h2>
        {themes.length === 0 ? (
          <p className="text-sm text-stone-500">No themes yet.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {themes.map((t) => (
              <li key={t.id} className="py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-stone-800">{t.name}</span>
                <form action={deleteThemeAction}>
                  <input type="hidden" name="id" value={t.id} />
                  <button
                    type="submit"
                    className="text-xs font-semibold text-red-700 hover:underline"
                  >
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
