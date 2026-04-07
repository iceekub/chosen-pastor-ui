import { verifySession } from '@/lib/dal'
import { Sidebar } from '@/components/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await verifySession()

  return (
    <div className="flex min-h-screen">
      <Sidebar
        userName={user.name}
        churchName={user.congregation_name}
        role={user.role}
      />
      <main className="flex-1 overflow-y-auto" style={{ background: 'transparent' }}>
        {children}
      </main>
    </div>
  )
}
