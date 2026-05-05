'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logoutAction } from '@/app/actions/auth'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/sermons',   label: 'Sermons',   icon: VideoIcon },
  { href: '/garden',    label: 'Garden',    icon: GardenIcon },
  { href: '/settings',  label: 'Settings',  icon: SettingsIcon },
]

const ADMIN_NAV = [
  { href: '/admin', label: 'Admin', icon: AdminIcon },
]

interface SidebarProps {
  userName: string
  churchName: string
  role: string
  logoUrl?: string | null
}

export function Sidebar({ userName, churchName, role, logoUrl }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="sidebar flex flex-col w-64 h-screen sticky top-0 shrink-0 overflow-y-auto">
      {/* Church logo block */}
      <div className="px-5 pt-7 pb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center shrink-0"
            style={{
              background: logoUrl ? 'transparent' : 'linear-gradient(135deg, #B8874A 0%, #8E6228 100%)',
              boxShadow: logoUrl ? 'none' : '0 2px 10px rgba(184,135,74,0.4)',
            }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={churchName} className="w-full h-full object-contain p-1" />
            ) : (
              <span
                className="text-sm font-bold tracking-wide"
                style={{ color: '#FDFAF5', fontFamily: 'var(--font-mulish)' }}
              >
                {churchName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p
              className="text-sm font-semibold leading-tight truncate"
              style={{ color: '#F0E4D0', fontFamily: 'var(--font-mulish)' }}
            >
              {churchName}
            </p>
            <p className="text-xs truncate mt-0.5" style={{ color: '#9A8878' }}>
              Church Portal
            </p>
          </div>
        </div>
      </div>

      <div className="mx-5 mb-4" style={{ height: '1px', background: '#3E2810' }} />

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== '/dashboard' && pathname.startsWith(href + '/'))
          return (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150"
              style={{
                fontFamily: 'var(--font-mulish)',
                fontWeight: active ? 600 : 500,
                color: active ? '#F0E4D0' : '#C0A888',
                background: active
                  ? 'linear-gradient(90deg, rgba(184,135,74,0.22) 0%, rgba(184,135,74,0.06) 100%)'
                  : 'transparent',
                borderLeft: `2px solid ${active ? '#B8874A' : 'transparent'}`,
              }}
            >
              <Icon className="w-4 h-4 shrink-0" style={{ color: active ? '#B8874A' : 'inherit' } as React.CSSProperties} />
              {label}
            </Link>
          )
        })}

        {role === 'super_admin' && (
          <>
            <div className="pt-5 pb-2 px-3">
              <span className="section-label" style={{ color: '#4A3828' }}>Super Admin</span>
            </div>
            {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ color: active ? '#F0E4D0' : '#C0A888' }}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User + Logout */}
      <div className="px-3 pb-4 pt-3" style={{ borderTop: '1px solid #3E2810' }}>
        <div className="px-3 py-2 mb-0.5">
          <p
            className="text-xs font-semibold truncate"
            style={{ color: '#E0CEB8', fontFamily: 'var(--font-mulish)' }}
          >
            {userName}
          </p>
          <p className="text-xs capitalize truncate mt-0.5" style={{ color: '#9A8878' }}>
            {role.replace('_', ' ')}
          </p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors"
            style={{ color: '#A89878', fontFamily: 'var(--font-mulish)', fontWeight: 500 }}
          >
            <LogoutIcon className="w-4 h-4 shrink-0" />
            Sign out
          </button>
        </form>

        {/* Chosen logo */}
        <div className="mt-5 px-3 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/chosen-logo.png" alt="Chosen" className="w-24 opacity-60" />
        </div>
      </div>
    </aside>
  )
}

/* ─── Icons ─────────────────────────────────────────────────────────────────── */

function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}

function VideoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 6h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />
    </svg>
  )
}

function GardenIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      {/* stem */}
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22v-7" />
      {/* left petal */}
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15c0-3.5-2.5-6.5-7-7.5 0 4 2.5 7.5 7 7.5z" />
      {/* right petal */}
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15c0-3.5 2.5-6.5 7-7.5 0 4-2.5 7.5-7 7.5z" />
    </svg>
  )
}

function DocumentIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}

function SettingsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function AdminIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.016H12v-.016z" />
    </svg>
  )
}

function TagIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  )
}

function PeopleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

function LogoutIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  )
}
