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
const adminProps  = { ...pastorProps, role: 'super_admin' }

beforeEach(() => vi.clearAllMocks())

describe('Sidebar — RBAC', () => {
  it('does not show super admin links for pastor role', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    render(<Sidebar {...pastorProps} />)
    expect(screen.queryByRole('link', { name: /add a church/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /churches/i })).not.toBeInTheDocument()
  })

  it('shows super admin links for admin role', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    render(<Sidebar {...adminProps} />)
    expect(screen.getByRole('link', { name: /add a church/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /churches/i })).toBeInTheDocument()
  })
})
