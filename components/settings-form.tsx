'use client'

import { useActionState, useState } from 'react'
import { saveChurchAction, saveBibleTranslationAction } from '@/app/actions/settings'
import { InviteStaffForm } from '@/components/invite-staff-form'
import type { SessionUser } from '@/lib/api/types'
import type { ChurchRead, BibleVersion } from '@/lib/api/churches'

interface Props {
  user: SessionUser
  church: ChurchRead | null
  bibleVersions: BibleVersion[]
  team: { id: string; name: string }[]
}

/* ── shared styles ── */

const sectionLabel = (text: string) => (
  <p className="section-label mb-5">{text}</p>
)

const fieldLabel = (text: string) => (
  <label
    className="block text-xs font-semibold mb-1.5"
    style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
  >
    {text}
  </label>
)

function Feedback({ state }: { state: { error?: string; success?: boolean } | null }) {
  if (!state) return null
  if (state.error) return (
    <p className="text-sm rounded-lg px-3 py-2" style={{ color: '#8B3A3A', background: 'rgba(139,58,58,0.08)', border: '1px solid rgba(139,58,58,0.2)', fontFamily: 'var(--font-mulish)' }}>
      {state.error}
    </p>
  )
  if (state.success) return (
    <p className="text-sm rounded-lg px-3 py-2" style={{ color: '#3A7A5A', background: 'rgba(90,138,106,0.1)', border: '1px solid rgba(90,138,106,0.25)', fontFamily: 'var(--font-mulish)' }}>
      Saved.
    </p>
  )
  return null
}

function SaveButton({ pending }: { pending: boolean }) {
  return (
    <div className="flex justify-end pt-2">
      <button type="submit" disabled={pending} className="btn-gold px-7 py-2.5 text-sm">
        {pending ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}

/* ── Church info form ── */

function ChurchForm({ church }: { church: ChurchRead | null }) {
  const [state, action, pending] = useActionState(saveChurchAction, null)

  return (
    <form action={action} className="surface px-6 py-6 space-y-4 anim-fadeUp" style={{ animationDelay: '0s' }}>
      {sectionLabel('Church')}

      <div>
        {fieldLabel('Church name')}
        <input name="church_name" type="text" defaultValue={church?.name ?? ''} placeholder="Grace Community Church" className="input-warm w-full" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          {fieldLabel('City')}
          <input name="church_city" type="text" defaultValue={church?.city ?? ''} placeholder="Nashville" className="input-warm w-full" />
        </div>
        <div>
          {fieldLabel('State')}
          <input name="church_state" type="text" defaultValue={church?.state ?? ''} placeholder="TN" maxLength={2} className="input-warm w-full uppercase" />
        </div>
      </div>

      <div>
        {fieldLabel('Contact email')}
        <input name="church_email" type="email" defaultValue={church?.contact_email ?? ''} placeholder="hello@yourchurch.com" className="input-warm w-full" />
      </div>

      <div>
        {fieldLabel('Contact phone')}
        <input name="church_phone" type="tel" defaultValue={church?.contact_phone ?? ''} placeholder="+1 (615) 000-0000" className="input-warm w-full" />
      </div>

      <div>
        {fieldLabel('Timezone')}
        <input name="timezone" type="text" defaultValue={church?.timezone ?? 'America/New_York'} placeholder="America/New_York" className="input-warm w-full" />
        <p className="text-xs mt-1" style={{ color: '#B0A090', fontFamily: 'var(--font-mulish)' }}>
          IANA timezone, e.g. America/Chicago, America/Los_Angeles
        </p>
      </div>

      <Feedback state={state} />
      <SaveButton pending={pending} />
    </form>
  )
}

/* ── Bible translation form ── */

function BibleTranslationForm({ church, bibleVersions }: { church: ChurchRead | null; bibleVersions: BibleVersion[] }) {
  const [state, action, pending] = useActionState(saveBibleTranslationAction, null)
  const [selected, setSelected] = useState(church?.bible_translation ?? 'KJV')

  return (
    <form action={action} className="surface px-6 py-6 anim-fadeUp" style={{ animationDelay: '0.08s' }}>
      {sectionLabel('Bible Translation')}
      <p className="text-xs mb-5" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
        Used when generating verse cards in Garden content.
      </p>

      {bibleVersions.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {bibleVersions.map(({ key, label }) => {
            const checked = selected === key
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
                  checked={checked}
                  onChange={() => setSelected(key)}
                  className="accent-[#B8874A]"
                />
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#2C1E0F' }}>{key}</p>
                  <p className="text-xs" style={{ color: '#8A7060' }}>{label}</p>
                </div>
              </label>
            )
          })}
        </div>
      ) : (
        <p className="text-sm mb-4" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
          Could not load translation options.
        </p>
      )}

      <Feedback state={state} />
      <SaveButton pending={pending} />
    </form>
  )
}

/* ── Main export ── */

export function SettingsForm({ user, church, bibleVersions, team }: Props) {
  return (
    <div className="space-y-8">

      <ChurchForm church={church} />

      <BibleTranslationForm church={church} bibleVersions={bibleVersions} />

      {/* Church assets */}
      <div className="surface px-6 py-6 anim-fadeUp" style={{ animationDelay: '0.16s' }}>
        {sectionLabel('Church Assets')}
        <p className="text-xs mb-4" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
          Logo and church image uploads coming soon.
        </p>
        <div className="rounded-xl border-dashed border-2 px-6 py-8 text-center" style={{ borderColor: '#D5C9B8' }}>
          <p className="text-sm" style={{ color: '#C5B49A', fontFamily: 'var(--font-mulish)' }}>
            Asset upload — coming soon
          </p>
        </div>
      </div>

      {/* Team */}
      <div className="surface px-6 py-6 anim-fadeUp" style={{ animationDelay: '0.22s' }}>
        {sectionLabel('Team')}
        <InviteStaffForm />

        {team.length > 0 && (
          <ul className="mt-6 divide-y" style={{ borderColor: 'rgba(200,182,155,0.3)' }}>
            {team.map((person) => (
              <li key={person.id} className="py-3">
                <p className="text-sm font-medium" style={{ color: '#2C1E0F', fontFamily: 'var(--font-mulish)' }}>
                  {person.name}
                </p>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs mt-6 pt-4" style={{ color: '#B0A090', fontFamily: 'var(--font-mulish)', borderTop: '1px solid rgba(200,182,155,0.3)' }}>
          Logged in as <span style={{ color: '#8A7060' }}>{user.name}</span> · {user.email}
        </p>
      </div>

    </div>
  )
}
