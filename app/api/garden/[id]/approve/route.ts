import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { approveGarden } from '@/lib/api/garden'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const garden = await approveGarden(Number(id))
    return NextResponse.json(garden)
  } catch {
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ id: Number(id), status: 'approved' })
    }
    return NextResponse.json({ error: 'Failed to approve garden' }, { status: 502 })
  }
}
