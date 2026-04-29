import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

function decodeJwtPart(token: string, part: 0 | 1) {
  try {
    const segment = token.split('.')[part]
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=')
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'))
  } catch {
    return null
  }
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No session' }, { status: 401 })

  const header = decodeJwtPart(session.accessToken, 0)
  const claims = decodeJwtPart(session.accessToken, 1)
  return NextResponse.json({
    session_user: session.user,
    jwt_header: header,
    jwt_claims: claims,
  })
}
