'use client'

import { useActionState, useState, useEffect } from 'react'
import { saveChurchAction, saveBibleTranslationAction } from '@/app/actions/settings'
import { uploadChurchLogoAction, uploadChurchAltLogoAction, uploadChurchImageAction } from '@/app/actions/storage'
import { InviteStaffForm } from '@/components/invite-staff-form'
import { ImageUpload } from '@/components/image-upload'
import { PastorsSection } from '@/components/pastors-section'
import type { SessionUser, Pastor } from '@/lib/api/types'
import type { ChurchRead, BibleVersion } from '@/lib/api/churches'

interface Props {
  user: SessionUser
  church: ChurchRead | null
  bibleVersions: BibleVersion[]
  team: { id: string; name: string }[]
  pastors: Pastor[]
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
  const [opacity, setOpacity] = useState(1)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (state?.success) {
      setOpacity(1)
      setHidden(false)
      const fadeStart = setTimeout(() => setOpacity(0), 2500)
      const remove    = setTimeout(() => setHidden(true), 3200)
      return () => { clearTimeout(fadeStart); clearTimeout(remove) }
    }
  }, [state])

  if (!state) return null
  if (state.error) return (
    <p className="text-sm rounded-lg px-3 py-2" style={{ color: '#8B3A3A', background: 'rgba(139,58,58,0.08)', border: '1px solid rgba(139,58,58,0.2)', fontFamily: 'var(--font-mulish)' }}>
      {state.error}
    </p>
  )
  if (state.success && !hidden) return (
    <p
      className="text-sm rounded-lg px-3 py-2"
      style={{
        color: '#3A7A5A', background: 'rgba(90,138,106,0.1)', border: '1px solid rgba(90,138,106,0.25)',
        fontFamily: 'var(--font-mulish)', opacity, transition: 'opacity 0.7s ease',
      }}
    >
      Saved
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
        {fieldLabel('Short name / alias')}
        <input name="church_alias" type="text" defaultValue={church?.alias ?? ''} placeholder="e.g. SBC, GCC" className="input-warm w-full" />
        <p className="text-xs mt-1" style={{ color: '#C5B49A', fontFamily: 'var(--font-mulish)' }}>
          Members can find your church by typing this alias in the app.
        </p>
      </div>

      <div>
        {fieldLabel('Contact email')}
        <input name="church_email" type="email" defaultValue={church?.contact_email ?? ''} placeholder="hello@gracechurch.com" className="input-warm w-full" />
      </div>

      <div>
        {fieldLabel('Contact phone')}
        <input name="church_phone" type="tel" defaultValue={church?.contact_phone ?? ''} placeholder="(615) 000-0000" className="input-warm w-full" />
      </div>

      <div>
        {fieldLabel('Timezone')}
        <select name="timezone" defaultValue={church?.timezone ?? 'America/New_York'} className="input-warm w-full">
          <option value="America/New_York">Eastern Time</option>
          <option value="America/Chicago">Central Time</option>
          <option value="America/Denver">Mountain Time</option>
          <option value="America/Phoenix">Mountain Time — Phoenix</option>
          <option value="America/Los_Angeles">Pacific Time</option>
          <option value="America/Anchorage">Alaska Time</option>
          <option value="Pacific/Honolulu">Hawaii Time</option>
        </select>
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

export function SettingsForm({ user, church, bibleVersions, team, pastors }: Props) {
  return (
    <div className="space-y-8">

      <ChurchForm church={church} />

      <BibleTranslationForm church={church} bibleVersions={bibleVersions} />

      {/* Church assets */}
      <div className="surface px-6 py-6 anim-fadeUp" style={{ animationDelay: '0.16s' }}>
        {sectionLabel('Church Assets')}
        <p className="text-xs mb-5" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
          Shown in the Chosen app on your church's profile and home screens.
        </p>
        <div className="space-y-5">
          {/* Logo row */}
          <div className="flex gap-4">
            <div style={{ width: 80, flexShrink: 0 }}>
              <ImageUpload
                action={uploadChurchLogoAction}
                currentUrl={church?.logo_url}
                label="Logo"
                aspectRatio="1/1"
              />
            </div>
            <div style={{ width: 80, flexShrink: 0 }}>
              <ImageUpload
                action={uploadChurchAltLogoAction}
                currentUrl={church?.alt_logo_url}
                label="Alt logo"
                aspectRatio="1/1"
              />
            </div>
          </div>
          {/* Hero image */}
          <div style={{ maxWidth: 280 }}>
            <ImageUpload
              action={uploadChurchImageAction}
              currentUrl={church?.image_url}
              label="Hero image"
              hint="Landscape — shown on your church's home screen"
              aspectRatio="16/9"
            />
          </div>
        </div>
      </div>

      {/* Pastors */}
      <div className="surface px-6 py-6 anim-fadeUp" style={{ animationDelay: '0.22s' }}>
        {sectionLabel('Pastors')}
        <PastorsSection initialPastors={pastors} />
      </div>

      {/* Team */}
      <div className="surface px-6 py-6 anim-fadeUp" style={{ animationDelay: '0.28s' }}>
        {sectionLabel('Team')}
        <InviteStaffForm />

        <div className="mt-6">
          <p className="text-xs font-semibold mb-3" style={{ color: '#C5B49A', fontFamily: 'var(--font-mulish)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Members
          </p>
          <ul className="divide-y" style={{ borderColor: 'rgba(200,182,155,0.3)' }}>
            {team.map((person) => (
              <li key={person.id} className="py-3 flex items-center justify-between">
                <p className="text-sm font-medium" style={{ color: '#2C1E0F', fontFamily: 'var(--font-mulish)' }}>
                  {person.name}
                </p>
                {person.id === user.id && (
                  <span
                    className="text-xs font-semibold rounded-full px-2.5 py-0.5"
                    style={{ background: 'rgba(184,135,74,0.1)', color: '#B8874A', fontFamily: 'var(--font-mulish)' }}
                  >
                    You
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

    </div>
  )
}
