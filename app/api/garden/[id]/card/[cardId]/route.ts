import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { updateCard } from '@/lib/api/garden'

interface Params {
  params: Promise<{ id: string; cardId: string }>
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, cardId } = await params
  const body = await request.json()

  try {
    const card = await updateCard(Number(id), Number(cardId), body)
    return NextResponse.json(card)
  } catch {
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ id: Number(cardId), ...body })
    }
    return NextResponse.json({ error: 'Failed to update card' }, { status: 502 })
  }
}
