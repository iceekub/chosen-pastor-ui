import { verifySession } from '@/lib/dal'
import { getChurchLogoUrl } from '@/lib/api/churches'
import { Sidebar } from '@/components/sidebar'
import { NotificationProvider } from '@/lib/notifications'
import { NotificationDisplay } from '@/components/notification-toast'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await verifySession()
  const logoUrl = user.church_id ? await getChurchLogoUrl(user.church_id) : null

  return (
    <NotificationProvider>
      <div className="flex min-h-screen">
        <Sidebar
          userName={user.name}
          churchName={user.church_name ?? "(no church)"}
          role={user.role}
          logoUrl={logoUrl}
        />
        <main className="flex-1 overflow-y-auto" style={{ background: 'transparent' }}>
          {children}
        </main>
      </div>
      <NotificationDisplay />
    </NotificationProvider>
  )
}
