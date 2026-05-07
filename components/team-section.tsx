'use client'

import { useState, useActionState } from 'react'
import { resendInviteAction } from '@/app/actions/staff'

interface Member {
  id: string
  name: string
}

interface ResendRowProps {
  member: Member
  currentUserId: string
}

function ResendRow({ member, currentUserId }: ResendRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [state, action, pending] = useActionState(resendInviteAction, null)

  const isYou = member.id === currentUserId

  return (
    <li className="py-3.5" style={{ borderBottom: '1px solid rgba(200,182,155,0.25)' }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: '#2C1E0F', fontFamily: 'var(--font-mulish)' }}>
          {member.name}
        </p>
        <div className="flex items-center gap-2">
          {isYou && (
            <span
              className="text-xs font-semibold rounded-full px-2.5 py-0.5"
              style={{ background: 'rgba(184,135,74,0.1)', color: '#B8874A', fontFamily: 'var(--font-mulish)' }}
            >
              You
            </span>
          )}
          {!isYou && !state?.success && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-xs underline"
              style={{ color: '#A09080', fontFamily: 'var(--font-mulish)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              {expanded ? 'Cancel' : 'Resend invite'}
            </button>
          )}
          {state?.success && (
            <span className="text-xs" style={{ color: '#3A7A5A', fontFamily: 'var(--font-mulish)' }}>
              ✓ Sent
            </span>
          )}
        </div>
      </div>

      {expanded && !state?.success && (
        <form action={action} className="mt-2 flex items-start gap-2">
          <input type="hidden" name="name" value={member.name} />
          <div className="flex-1">
            <input
              name="email"
              type="email"
              required
              placeholder="their@email.com"
              className="input-warm w-full text-xs py-1.5"
              style={{ fontSize: 13 }}
            />
            {state?.error && (
              <p className="text-xs mt-1" style={{ color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}>
                {state.error}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={pending}
            className="btn-gold px-3 py-1.5 text-xs shrink-0"
          >
            {pending ? 'Sending…' : 'Resend'}
          </button>
        </form>
      )}
    </li>
  )
}

interface TeamSectionProps {
  team: Member[]
  currentUserId: string
}

export function TeamSection({ team, currentUserId }: TeamSectionProps) {
  return (
    <ul>
      {team.map((person) => (
        <ResendRow key={person.id} member={person} currentUserId={currentUserId} />
      ))}
    </ul>
  )
}
