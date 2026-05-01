'use client'

import { useActionState } from 'react'
import { saveSettingsAction } from '@/app/actions/settings'
import type { SessionUser } from '@/lib/api/types'
import type { ChurchRead, BibleVersion } from '@/lib/api/churches'

interface Props {
  user: SessionUser
  church: ChurchRead | null
  bibleVersions: BibleVersion[]
}

export function SettingsForm({ user, church, bibleVersions }: Props) {
  const [state, action, pending] = useActionState(saveSettingsAction, null)

  const label = (text: string) => (
    <label
      className="block text-xs font-semibold mb-1.5"
      style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
    >
      {text}
    </label>
  )

  return (
    <form action={action} className="space-y-8">

      {/* ── Church ── */}
      <div className="surface px-6 py-6 anim-fadeUp" style={{ animationDelay: '0s' }}>
        <p className="section-label mb-5">Church</p>
        <div className="space-y-4">

          <div>
            {label('Church name')}
            <input
              name="church_name"
              type="text"
              defaultValue={church?.name ?? user.church_name ?? ''}
              placeholder="Grace Community Church"
              className="input-warm w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              {label('City')}
              <input
                name="church_city"
                type="text"
                defaultValue={church?.city ?? ''}
                placeholder="Nashville"
                className="input-warm w-full"
              />
            </div>
            <div>
              {label('State')}
              <input
                name="church_state"
                type="text"
                defaultValue={church?.state ?? ''}
                placeholder="TN"
                maxLength={2}
                className="input-warm w-full uppercase"
              />
            </div>
          </div>

          <div>
            {label('Contact email')}
            <input
              name="church_email"
              type="email"
              defaultValue={church?.contact_email ?? ''}
              placeholder="hello@yourchurch.com"
              className="input-warm w-full"
            />
          </div>

          <div>
            {label('Contact phone')}
            <input
              name="church_phone"
              type="tel"
              defaultValue={church?.contact_phone ?? ''}
              placeholder="+1 (615) 000-0000"
              className="input-warm w-full"
            />
          </div>

          <div>
            {label('Timezone')}
            <input
              name="timezone"
              type="text"
              defaultValue={church?.timezone ?? 'America/New_York'}
              placeholder="America/New_York"
              className="input-warm w-full"
            />
            <p className="text-xs mt-1" style={{ color: '#B0A090', fontFamily: 'var(--font-mulish)' }}>
              IANA timezone, e.g. America/Chicago, America/Los_Angeles
            </p>
          </div>

        </div>
      </div>

      {/* ── Bible translation ── */}
      <div className="surface px-6 py-6 anim-fadeUp" style={{ animationDelay: '0.08s' }}>
        <p className="section-label mb-1">Bible Translation</p>
        <p className="text-xs mb-5" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
          Used when generating verse cards in Garden content.
        </p>

        {bibleVersions.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {bibleVersions.map(({ key, label: vLabel }) => {
              const checked = (church?.bible_translation ?? 'KJV') === key
              return (
                <label
                  key={key}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer transition-colors"
                  style={{
                    border: checked ? '2px solid #B8874A' : '1px solid rgba(200,182,155,0.4)',
                    background: checked ? 'rgba(184,135,74,0.06)' : 'transparent',
                    fontFamily: 'var(--font-mulish)',
                  }}
                >
                  <input
                    type="radio"
                    name="bible_translation"
                    value={key}
                    defaultChecked={checked}
                    className="accent-[#B8874A]"
                  />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#2C1E0F' }}>{key}</p>
                    <p className="text-xs" style={{ color: '#8A7060' }}>{vLabel}</p>
                  </div>
                </label>
              )
            })}
          </div>
        ) : (
          <p className="text-sm" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
            Could not load translation options.
          </p>
        )}
      </div>

      {/* ── Your account ── */}
      <div className="surface px-6 py-6 anim-fadeUp" style={{ animationDelay: '0.16s' }}>
        <p className="section-label mb-5">Your account</p>
        <div className="space-y-4">
          <div>
            {label('Name')}
            <input
              name="account_name"
              type="text"
              defaultValue={user.name ?? ''}
              placeholder="John Smith"
              className="input-warm w-full"
              disabled
            />
            <p className="text-xs mt-1" style={{ color: '#B0A090', fontFamily: 'var(--font-mulish)' }}>
              Contact Chosen support to update your name.
            </p>
          </div>
          <div>
            {label('Email')}
            <input
              name="account_email"
              type="email"
              defaultValue={user.email ?? ''}
              placeholder="you@yourchurch.com"
              className="input-warm w-full"
              disabled
            />
            <p className="text-xs mt-1" style={{ color: '#B0A090', fontFamily: 'var(--font-mulish)' }}>
              Contact Chosen support to update your login email.
            </p>
          </div>
        </div>
      </div>

      {/* ── Assets placeholder ── */}
      <div className="surface px-6 py-6 anim-fadeUp" style={{ animationDelay: '0.22s' }}>
        <p className="section-label mb-2">Church assets</p>
        <p className="text-xs mb-4" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
          Logo and church image uploads coming soon.
        </p>
        <div
          className="rounded-xl border-dashed border-2 px-6 py-8 text-center"
          style={{ borderColor: '#D5C9B8' }}
        >
          <p className="text-sm" style={{ color: '#C5B49A', fontFamily: 'var(--font-mulish)' }}>
            Asset upload — coming soon
          </p>
        </div>
      </div>

      {/* ── Feedback ── */}
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

      <div className="flex justify-end anim-fadeUp" style={{ animationDelay: '0.28s' }}>
        <button type="submit" disabled={pending} className="btn-gold px-7 py-2.5 text-sm">
          {pending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
