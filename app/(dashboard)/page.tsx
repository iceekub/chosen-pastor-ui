import { redirect } from 'next/navigation'

// /dashboard is the canonical path; redirect bare / to it
export default function RootDashboardPage() {
  redirect('/dashboard')
}
