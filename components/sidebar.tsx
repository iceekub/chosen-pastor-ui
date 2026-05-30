'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logoutAction } from '@/app/actions/auth'
import { clearChurchSwitchAction } from '@/app/actions/admin'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/sermons',   label: 'Services',   icon: VideoIcon },
  { href: '/garden',    label: 'Garden',    icon: GardenIcon },
  { href: '/settings',  label: 'Settings',  icon: SettingsIcon },
]

const ADMIN_NAV = [
  { href: '/admin', label: 'Add a Church', icon: AdminIcon },
  { href: '/admin/churches', label: 'Churches', icon: PeopleIcon },
]

interface SidebarProps {
  userName: string
  churchName: string
  role: string
  logoUrl?: string | null
  /** Set when a super_admin is emulating a different church */
  emulatedChurchName?: string | null
}

export function Sidebar({ userName, churchName, role, logoUrl, emulatedChurchName }: SidebarProps) {
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
              className="text-sm font-semibold leading-tight line-clamp-3"
              style={{ color: '#F2FAF2', fontFamily: 'var(--font-mulish)' }}
            >
              {churchName}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-5 mb-4" style={{ height: '1px', background: 'rgba(79,113,71,0.35)' }} />

      {/* Emulation banner */}
      {emulatedChurchName && (
        <div className="mx-3 mb-3 rounded-xl px-3 py-2.5" style={{ background: 'rgba(79,113,71,0.25)', border: '1px solid rgba(181,210,173,0.2)' }}>
          <p className="text-[10px] font-semibold mb-0.5" style={{ color: '#B5D2AD', fontFamily: 'var(--font-mulish)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Viewing as
          </p>
          <p className="text-xs font-semibold leading-tight mb-1.5" style={{ color: '#D4EDDA', fontFamily: 'var(--font-mulish)' }}>
            {emulatedChurchName}
          </p>
          <form action={clearChurchSwitchAction}>
            <button
              type="submit"
              className="text-[10px] font-semibold underline"
              style={{ color: '#B5D2AD', fontFamily: 'var(--font-mulish)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              Exit to my view
            </button>
          </form>
        </div>
      )}

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
                color: active ? '#FEECD3' : '#A8C8B0',
                background: active
                  ? 'linear-gradient(90deg, rgba(181,210,173,0.2) 0%, rgba(181,210,173,0.05) 100%)'
                  : 'transparent',
                borderLeft: `2px solid ${active ? '#C8E4C0' : 'transparent'}`,
              }}
            >
              <Icon className="w-4 h-4 shrink-0" style={{ color: active ? '#C8E4C0' : '#7AAE88' } as React.CSSProperties} />
              {label}
            </Link>
          )
        })}

        {role === 'super_admin' && (
          <>
            <div className="pt-5 pb-2 px-3">
              <span className="section-label" style={{ color: '#7AAE88' }}>Super Admin</span>
            </div>
            {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150"
                  style={{
                    fontFamily: 'var(--font-mulish)',
                    fontWeight: active ? 600 : 500,
                    color: active ? '#FEECD3' : '#A8C8B0',
                    background: active
                      ? 'linear-gradient(90deg, rgba(181,210,173,0.2) 0%, rgba(181,210,173,0.05) 100%)'
                      : 'transparent',
                    borderLeft: `2px solid ${active ? '#C8E4C0' : 'transparent'}`,
                  }}
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ color: active ? '#C8E4C0' : '#7AAE88' } as React.CSSProperties} />
                  {label}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User + Logout */}
      <div className="px-3 pb-4 pt-3" style={{ borderTop: '1px solid rgba(79,113,71,0.35)' }}>
        <div className="px-3 py-2 mb-0.5">
          <p
            className="text-xs font-semibold truncate"
            style={{ color: '#E8F8E8', fontFamily: 'var(--font-mulish)' }}
          >
            {userName}
          </p>
          <p className="text-xs capitalize truncate mt-0.5" style={{ color: '#A8C8B0' }}>
            {role.replace('_', ' ')}
          </p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors"
            style={{ color: '#A8C8B0', fontFamily: 'var(--font-mulish)', fontWeight: 500 }}
          >
            <LogoutIcon className="w-4 h-4 shrink-0" />
            Sign out
          </button>
        </form>

        {/* Six Seeds mark + wordmark */}
        <div className="mt-5 px-3 flex justify-center items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 1024 1027" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.65, flexShrink: 0 }}>
            <path d="M477.097 342.066L477.097 614.406L749.438 614.406C899.847 614.406 1021.78 492.475 1021.78 342.066L1021.78 331.172C1021.78 186.779 904.724 69.7257 760.331 69.7257L749.437 69.7257C599.028 69.7257 477.097 191.657 477.097 342.066Z" fill="#FEECD3"/>
            <path d="M-1.52588e-05 699.458L-1.52588e-05 372.65L326.809 372.65C507.3 372.65 653.617 518.967 653.617 699.458C653.617 879.95 507.3 1026.27 326.809 1026.27C146.317 1026.27 -1.52588e-05 879.95 -1.52588e-05 699.458Z" fill="#B5D2AD"/>
            <path d="M477.097 409.182C557.539 450.915 618.434 525.103 642.439 614.406H477.097V409.182Z" fill="#A1BF99"/>
            <path d="M785.316 181.002C786.527 180.259 787.958 179.934 789.342 180.149C790.73 180.363 791.962 181.093 792.785 182.177C793.608 183.261 793.98 184.643 793.814 186.038C793.649 187.429 792.952 188.722 791.91 189.69C788.321 193.023 784.712 196.4 781.144 199.775V199.776C731.249 247.15 662.638 317.424 636.004 345.61C622.698 359.691 612.483 369.938 605.163 377.468C601.508 381.228 598.567 384.321 596.332 386.868C594.11 389.4 592.528 391.457 591.646 393.14C591.301 393.799 590.954 394.159 590.648 394.356C590.353 394.545 590.027 394.626 589.636 394.614C588.771 394.588 587.701 394.12 586.361 393.392C585.12 392.717 583.644 391.816 582.251 391.293C580.835 390.761 579.191 390.491 577.67 391.398V391.4C576.451 392.123 575.106 392.57 573.776 392.555C572.442 392.54 571.229 392.074 570.336 391.251C569.443 390.428 568.88 389.256 568.757 387.928C568.633 386.603 568.974 385.225 569.597 383.951L569.825 383.43C570.833 380.81 569.826 378.135 569.08 375.995C568.226 373.546 567.672 371.706 568.563 370.031C578.271 360.261 585.822 352.001 592.668 344.417C599.544 336.799 605.696 329.881 612.619 322.782C661.163 273.116 714.1 227.093 772.68 188.989C776.86 186.282 781.093 183.602 785.316 181.002Z" fill="#B4926C"/>
            <path d="M697.149 568.85C719.547 569.509 742.103 567.468 764.138 562.685C887.405 537.937 985.917 418.93 985.197 289.776C986.288 198.996 986.86 108.216 986.914 17.4365L986.903 1.12241e-05L969.488 0.0107549C964.754 0.00788677 960.02 0.00684951 955.285 0.00684993C869.24 0.00685877 783.194 0.47214 697.149 1.40336C557.279 0.0265991 430.898 116.074 418.779 251.565C417.387 264.314 416.887 277.004 417.241 289.776C417.576 301.424 417.92 313.071 418.272 324.719L431.344 324.719C431.696 313.071 432.039 301.424 432.374 289.776C432.732 277.68 433.88 265.764 435.834 253.885C454.619 127.66 573.336 29.6026 697.149 33.4698C782.125 34.3894 867.102 34.8538 952.079 34.8652C952.192 119.836 952.76 204.806 953.78 289.776C957.145 404.471 874.192 516.098 760.048 545.966C739.646 551.573 718.49 554.734 697.149 555.385C694.97 555.45 692.791 555.515 690.613 555.581L690.613 568.653C692.791 568.719 694.97 568.784 697.149 568.85Z" fill="#B4926C"/>
            <path d="M52.2891 303.785C161.225 304.355 270.162 305.209 379.098 306.348C518.054 305.841 649.277 400.724 693.438 529.896C706.81 567.532 713.193 607.471 712.442 647.169C713.169 686.068 713.859 724.969 714.513 763.868C715.69 833.905 716.748 903.941 717.689 973.978L717.846 985.601L705.906 985.761C596.97 987.225 488.034 988.404 379.098 989.299C196.82 995.309 30.3441 830.686 34.8594 647.169C34.8594 538.233 35.1443 429.296 35.7139 320.36L35.628 303.872L52.2891 303.785ZM677.313 535.915C631.13 414.88 506.448 331.227 379.098 334.373C275.714 335.454 172.329 336.276 68.9454 336.844C69.4589 440.285 69.7188 543.727 69.7188 647.169C65.7686 811.808 213.219 961.111 379.098 958.656C476.292 959.455 573.486 960.484 670.681 961.736C642.043 924.922 629.773 910.245 611.66 889.702C543.006 812.084 469.556 738.567 391.272 669.31C385.726 664.405 380.106 659.485 374.413 654.554C373.143 653.452 372.286 651.919 372.075 650.233C371.865 648.548 372.312 646.857 373.326 645.521C374.341 644.184 375.85 643.3 377.529 643.051C379.209 642.801 380.916 643.215 382.318 644.143C388.645 648.339 394.889 652.557 401.047 656.794C487.949 716.71 567.655 787.311 637.797 866.636C655.142 886.306 678.947 911.463 694.656 935.334C695.459 878.179 696.339 821.023 697.3 763.868C697.953 724.969 698.644 686.068 699.37 647.169C698.665 608.993 691.185 571.159 677.313 535.915Z" fill="#4F7147"/>
          </svg>
          <span
            style={{ color: 'rgba(200,228,192,0.65)', fontFamily: 'var(--font-bellota)', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.18em', textTransform: 'uppercase' }}
          >
            Six Seeds
          </span>
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
