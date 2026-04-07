'use client'

import { useActionState } from 'react'
import { saveSettingsAction } from '@/app/actions/settings'
import type { SessionUser } from '@/lib/api/types'

export function SettingsForm({ user }: { user: SessionUser }) {
  const [state, action, pending] = useActionState(saveSettingsAction, null)

  const fields = [
    { section: 'Church', items: [
      { name: 'church_name',  label: 'Church name',    defaultValue: user.congregation_name, placeholder: 'Grace Community Church' },
      { name: 'church_city',  label: 'City',           defaultValue: '',                     placeholder: 'Nashville' },
      { name: 'church_state', label: 'State',          defaultValue: '',                     placeholder: 'TN' },
      { name: 'church_email', label: 'Contact email',  defaultValue: '',                     placeholder: 'hello@yourchurch.com', type: 'email' },
      { name: 'church_phone', label: 'Contact phone',  defaultValue: '',                     placeholder: '+1 (615) 000-0000', type: 'tel' },
    ]},
    { section: 'Pastor', items: [
      { name: 'pastor_name',  label: 'Pastor name',    defaultValue: user.name,              placeholder: 'Pastor John Smith' },
      { name: 'pastor_email', label: 'Pastor email',   defaultValue: user.email,             placeholder: 'pastor@yourchurch.com', type: 'email' },
    ]},
  ]

  return (
    <form action={action} className="space-y-8">
      {fields.map(({ section, items }, si) => (
        <div key={section} className="surface px-6 py-6 anim-fadeUp" style={{ animationDelay: `${si * 0.08}s` }}>
          <p className="section-label mb-5">{section}</p>
          <div className="space-y-4">
            {items.map(({ name, label, defaultValue, placeholder, type = 'text' }) => (
              <div key={name}>
                <label
                  htmlFor={name}
                  className="block text-xs font-semibold mb-1.5"
                  style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                >
                  {label}
                </label>
                <input
                  id={name}
                  name={name}
                  type={type}
                  defaultValue={defaultValue}
                  placeholder={placeholder}
                  className="input-warm"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Logo upload (placeholder) */}
      <div className="surface px-6 py-6 anim-fadeUp" style={{ animationDelay: '0.16s' }}>
        <p className="section-label mb-2">Church logo</p>
        <p className="text-xs mb-4" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
          Displayed in the sidebar and pastor portal header.
        </p>
        <div
          className="rounded-xl border-dashed border-2 px-6 py-8 text-center cursor-pointer"
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
