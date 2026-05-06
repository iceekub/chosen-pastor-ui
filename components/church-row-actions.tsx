'use client'

import { useRef, useActionState, useTransition } from 'react'
import { switchChurchAction, inviteToChurchAction } from '@/app/actions/admin'

interface Props {
  churchId: string
  churchName: string
}

export function ChurchRowActions({ churchId, churchName }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [inviteState, inviteAction, invitePending] = useActionState(inviteToChurchAction, null)
  const [switching, startSwitch] = useTransition()

  function handleSwitch() {
    startSwitch(async () => {
      await switchChurchAction(churchId, churchName)
    })
  }

  function openModal() {
    dialogRef.current?.showModal()
  }

  function closeModal() {
    dialogRef.current?.close()
  }

  return (
    <>
      <div className="flex items-center gap-3 justify-end">
        <button
          type="button"
          onClick={handleSwitch}
          disabled={switching}
          className="text-xs font-semibold underline disabled:opacity-50"
          style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          {switching ? 'Switching…' : 'Switch to'}
        </button>

        <button
          type="button"
          onClick={openModal}
          className="text-xs font-semibold underline"
          style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          Invite
        </button>
      </div>

      {/* Native dialog modal */}
      <dialog
        ref={dialogRef}
        className="rounded-2xl p-0 shadow-2xl backdrop:bg-black/40"
        style={{ border: 'none', maxWidth: 420, width: '90vw' }}
        onClick={(e) => { if (e.target === dialogRef.current) closeModal() }}
      >
        <div className="px-6 py-5" style={{ background: '#FDFAF5' }}>
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="section-label mb-0.5">Invite Staff</p>
              <p className="text-sm font-semibold" style={{ color: '#2C1E0F', fontFamily: 'var(--font-mulish)' }}>
                {churchName}
              </p>
            </div>
            <button
              type="button"
              onClick={closeModal}
              className="text-lg leading-none mt-0.5"
              style={{ color: '#A09080', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {inviteState?.success ? (
            <div className="py-4 text-center">
              <p
                className="text-sm rounded-xl px-4 py-3"
                style={{ color: '#3A7A5A', background: 'rgba(90,138,106,0.1)', border: '1px solid rgba(90,138,106,0.25)', fontFamily: 'var(--font-mulish)' }}
              >
                {inviteState.success}
              </p>
              <button
                type="button"
                onClick={closeModal}
                className="btn-gold mt-4 px-6 py-2 text-sm"
              >
                Done
              </button>
            </div>
          ) : (
            <form action={inviteAction} className="space-y-3">
              <input type="hidden" name="church_id" value={churchId} />

              <div>
                <label
                  className="block text-xs font-semibold mb-1.5"
                  style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                >
                  Full name
                </label>
                <input
                  name="name"
                  required
                  placeholder="Sarah Johnson"
                  className="input-warm w-full"
                />
              </div>

              <div>
                <label
                  className="block text-xs font-semibold mb-1.5"
                  style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                >
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="sarah@church.com"
                  className="input-warm w-full"
                />
              </div>

              {inviteState?.error && (
                <p
                  className="text-sm rounded-lg px-3 py-2"
                  style={{ color: '#8B3A3A', background: 'rgba(139,58,58,0.08)', border: '1px solid rgba(139,58,58,0.2)', fontFamily: 'var(--font-mulish)' }}
                >
                  {inviteState.error}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-sm"
                  style={{ color: '#A09080', fontFamily: 'var(--font-mulish)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invitePending}
                  className="btn-gold px-6 py-2 text-sm"
                >
                  {invitePending ? 'Sending…' : 'Send invite'}
                </button>
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  )
}
