vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))
vi.mock('@/app/actions/auth', () => ({
  logoutAction: vi.fn(),
}))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'

const mockUsePathname = usePathname as ReturnType<typeof vi.fn>

const pastorProps = { userName: 'Pastor Jane', churchName: 'Grace Community', role: 'pastor' }
const adminProps  = { ...pastorProps, role: 'admin' }

beforeEach(() => vi.clearAllMocks())

describe('Sidebar — church branding', () => {
  it('displays the church name', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    render(<Sidebar {...pastorProps} />)
    expect(screen.getByText('Grace Community')).toBeInTheDocument()
  })

  it('shows the first two characters of church name as initials', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    render(<Sidebar {...pastorProps} />)
    expect(screen.getByText('GR')).toBeInTheDocument()
  })

  it('displays pastor name', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    render(<Sidebar {...pastorProps} />)
    expect(screen.getByText('Pastor Jane')).toBeInTheDocument()
  })

  it('displays CHOSEN wordmark', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    render(<Sidebar {...pastorProps} />)
    expect(screen.getByText('CHOSEN')).toBeInTheDocument()
  })
})

describe('Sidebar — navigation active states', () => {
  it('marks Dashboard as active on /dashboard', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    render(<Sidebar {...pastorProps} />)
    const link = screen.getByRole('link', { name: /dashboard/i })
    expect(link).toHaveStyle({ borderLeft: '2px solid #B8874A' })
  })

  it('marks Sermons as active on /sermons', () => {
    mockUsePathname.mockReturnValue('/sermons')
    render(<Sidebar {...pastorProps} />)
    const link = screen.getByRole('link', { name: /sermons/i })
    expect(link).toHaveStyle({ borderLeft: '2px solid #B8874A' })
  })

  it('marks Sermons as active on /sermons/upload (startsWith)', () => {
    mockUsePathname.mockReturnValue('/sermons/upload')
    render(<Sidebar {...pastorProps} />)
    const link = screen.getByRole('link', { name: /sermons/i })
    expect(link).toHaveStyle({ borderLeft: '2px solid #B8874A' })
  })

  it('does not mark Dashboard as active on /sermons', () => {
    mockUsePathname.mockReturnValue('/sermons')
    render(<Sidebar {...pastorProps} />)
    const link = screen.getByRole('link', { name: /dashboard/i })
    // Active links have the gold colour — inactive ones must not
    expect(link).not.toHaveStyle({ borderLeft: '2px solid #B8874A' })
  })
})

describe('Sidebar — RBAC', () => {
  it('does not show Admin link for pastor role', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    render(<Sidebar {...pastorProps} />)
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument()
  })

  it('shows Admin link for admin role', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    render(<Sidebar {...adminProps} />)
    expect(screen.getByRole('link', { name: /admin/i })).toBeInTheDocument()
  })
})
