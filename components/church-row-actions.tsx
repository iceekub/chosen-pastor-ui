'use client'

import { useState, useActionState, useTransition } from 'react'
import { switchChurchAction, inviteToChurchAction } from '@/app/actions/admin'

interface Props {
  churchId: string
  churchName: string
}

export function ChurchRowActions({ churchId, churchName }: Props) {
  const [showInvite, setShowInvite] = useState(false)
  const [inviteState, inviteAction, invitePending] = useActionState(inviteToChurchAction, null)
  const [switching, startSwitch] = useTransition()

  function handleSwitch() {
    startSwitch(async () => {
      await switchChurchAction(churchId, churchName)
    })
  }

  // Close form on success
  const succeeded = !!inviteState?.success

  return (
    <div className="flex flex-col items-end gap-2 min-w-[120px]">
      <div className="flex items-center gap-3">
        {/* Switch button */}
        <button
          type="button"
          onClick={handleSwitch}
          disabled={switching}
          className="text-xs font-semibold underline disabled:opacity-50"
          style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          {switching ? 'Switching…' : 'Switch to'}
        </button>

        {/* Invite toggle */}
        <button
          type="button"
          onClick={() => { setShowInvite((v) => !v) }}
          className="text-xs font-semibold underline"
          style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          {showInvite ? 'Cancel' : 'Invite'}
        </button>
      </div>

      {/* Inline invite form */}
      {showInvite && !succeeded && (
        <form
          action={inviteAction}
          className="flex flex-col gap-2 w-56 rounded-xl p-3"
          style={{ background: 'rgba(200,182,155,0.08)', border: '1px solid rgba(200,182,155,0.2)' }}
        >
          <input type="hidden" name="church_id" value={churchId} />
          <input
            name="name"
            required
            placeholder="Full name"
            className="input-warm w-full text-xs py-1.5"
            style={{ fontSize: '12px' }}
          />
          <input
            name="email"
            type="email"
            required
            placeholder="email@church.com"
            className="input-warm w-full text-xs py-1.5"
            style={{ fontSize: '12px' }}
          />
          {inviteState?.error && (
            <p className="text-xs" style={{ color: '#8B3A3A', fontFamily: 'var(--font-mulish)' }}>
              {inviteState.error}
            </p>
          )}
          <button
            type="submit"
            disabled={invitePending}
            className="btn-gold text-xs py-1.5 w-full"
          >
            {invitePending ? 'Sending…' : 'Send invite'}
          </button>
        </form>
      )}

      {/* Success state */}
      {succeeded && showInvite && (
        <p
          className="text-xs rounded-lg px-3 py-1.5"
          style={{ color: '#3A7A5A', background: 'rgba(90,138,106,0.1)', border: '1px solid rgba(90,138,106,0.25)', fontFamily: 'var(--font-mulish)' }}
        >
          {inviteState?.success}
        </p>
      )}
    </div>
  )
}
