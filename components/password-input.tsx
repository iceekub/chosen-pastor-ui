'use client'

import { useState } from 'react'

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Additional className merged onto the wrapper div */
  wrapperClassName?: string
}

export function PasswordInput({ className = 'input-warm', wrapperClassName, ...props }: Props) {
  const [show, setShow] = useState(false)

  return (
    <div className={`relative ${wrapperClassName ?? ''}`}>
      <input
        {...props}
        type={show ? 'text' : 'password'}
        className={`${className} pr-10`}
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 flex items-center px-3 transition-opacity opacity-40 hover:opacity-70"
        style={{ color: '#8A7060' }}
      >
        {show ? (
          /* eye-off */
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          /* eye */
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  )
}
