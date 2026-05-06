'use client'

import { useState } from 'react'

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={value}
      className="text-xs font-mono inline-flex items-center gap-1 group"
      style={{ color: '#8A7060', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
    >
      <span>{value.slice(0, 8)}…{value.slice(-4)}</span>
      <span style={{ color: copied ? '#5A8A6A' : '#C5B49A', fontSize: 10 }}>
        {copied ? '✓' : '⎘'}
      </span>
    </button>
  )
}
