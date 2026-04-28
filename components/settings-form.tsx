'use client'

import { useActionState } from 'react'
import { saveSettingsAction } from '@/app/actions/settings'
import type { SessionUser } from '@/lib/api/types'

const labelStyle = {
  color: '#8A7060',
  fontFamily: 'var(--font-mulish)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold mb-1.5" style={labelStyle}>
      {children}
    </label>
  )
}

export function SettingsForm({ user }: { user: SessionUser }) {
  const [state, action, pending] = useActionState(saveSettingsAction, null)

  return (
    <form action={action} className="space-y-8">

      {/* Church */}
      <div className="surface px-6 py-6 anim-fadeUp">
        <p className="section-label mb-5">Church</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="church_name">Church name</Label>
            <input id="church_name" name="church_name" type="text"
              defaultValue={user.congregation_name}
              placeholder="Grace Community Church" className="input-warm" />
          </div>
          <div>
            <Label htmlFor="church_alias">
              Church alias{' '}
              <span style={{ color: '#C5B49A', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </Label>
            <input id="church_alias" name="church_alias" type="text"
              defaultValue="" placeholder="GCC" className="input-warm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="church_city">City</Label>
              <input id="church_city" name="church_city" type="text"
                defaultValue="" placeholder="Nashville" className="input-warm" />
            </div>
            <div>
              <Label htmlFor="church_state">State</Label>
              <input id="church_state" name="church_state" type="text"
                defaultValue="" placeholder="TN" className="input-warm" />
            </div>
          </div>
          <div>
            <Label htmlFor="church_email">Contact email</Label>
            <input id="church_email" name="church_email" type="email"
              defaultValue="" placeholder="hello@yourchurch.com" className="input-warm" />
          </div>
          <div>
            <Label htmlFor="church_phone">Contact phone</Label>
            <input id="church_phone" name="church_phone" type="tel"
              defaultValue="" placeholder="+1 (615) 000-0000" className="input-warm" />
          </div>
        </div>
      </div>

      {/* Pastor */}
      <div className="surface px-6 py-6 anim-fadeUp" style={{ animationDelay: '0.08s' }}>
        <p className="section-label mb-4">Pastor</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="pastor_name">Pastor name</Label>
            <input id="pastor_name" name="pastor_name" type="text"
              defaultValue={user.name ?? ''}
              placeholder="Pastor John Smith" className="input-warm" />
          </div>
          <div>
            <Label htmlFor="pastor_email">Pastor email</Label>
            <input id="pastor_email" name="pastor_email" type="email"
              defaultValue={user.email ?? ''}
              placeholder="pastor@yourchurch.com" className="input-warm" />
          </div>
        </div>
      </div>

      {/* Church logo */}
      <div className="surface px-6 py-6 anim-fadeUp" style={{ animationDelay: '0.16s' }}>
        <p className="section-label mb-2">Church logo</p>
        <p className="text-xs mb-4" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
          Displayed in the sidebar and pastor portal header.
        </p>
        <div
          className="rounded-xl border-dashed border-2 px-6 py-8 text-center"
          style={{ borderColor: '#D5C9B8' }}
        >
          <p className="text-sm" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
            Click to upload logo — PNG or SVG, square preferred
          </p>
          <p className="text-xs mt-1" style={{ color: '#C5B49A', fontFamily: 'var(--font-mulish)' }}>
            Coming soon
          </p>
        </div>
      </div>

      {state?.error && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(200,80,60,0.08)', border: '1px solid rgba(200,80,60,0.2)', color: '#A03020', fontFamily: 'var(--font-mulish)' }}>
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(90,138,106,0.1)', border: '1px solid rgba(90,138,106,0.25)', color: '#3A7A5A', fontFamily: 'var(--font-mulish)' }}>
          Settings saved successfully.
        </div>
      )}

      <div className="flex justify-end anim-fadeUp" style={{ animationDelay: '0.22s' }}>
        <button type="submit" disabled={pending} className="btn-gold px-7 py-2.5 text-sm">
          {pending ? 'Saving…' : 'Save changes'}
        </button>
      </div>

    </form>
  )
}
