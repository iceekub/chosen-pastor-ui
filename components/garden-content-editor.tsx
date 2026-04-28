'use client'

import type { Garden, GardenCard, ReflectionFinalCard } from '@/lib/api/types'

interface Props {
  garden: Garden
}

// ─── Card renderers ───────────────────────────────────────────────────────────

function CardShell({ index, tag, children }: { index: number; tag: string; children: React.ReactNode }) {
  return (
    <div className="surface overflow-hidden anim-fadeUp" style={{ animationDelay: `${index * 0.05}s` }}>
      <div
        className="flex items-center justify-between px-5 py-2.5"
        style={{ background: 'rgba(230,218,200,0.3)', borderBottom: '1px solid #EAD9C4' }}
      >
        <span className="section-label" style={{ color: '#C5B49A' }}>Card {index + 1}</span>
        <span className="text-xs font-semibold" style={{ color: '#C5B49A', fontFamily: 'var(--font-mulish)', letterSpacing: '0.04em' }}>
          {tag}
        </span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function VerseCardView({ card, index }: { card: Extract<GardenCard, { type: 'verse' }>; index: number }) {
  return (
    <CardShell index={index} tag={card.tag}>
      {card.citation && (
        <p className="text-xs font-semibold mb-2" style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}>
          {card.citation}
        </p>
      )}
      <p className="text-sm leading-relaxed italic" style={{ color: '#2C1E0F', fontFamily: 'var(--font-playfair)' }}>
        {card.content}
      </p>
      {card.footerText && (
        <p className="text-xs mt-2" style={{ color: '#8A7060', fontFamily: 'var(--font-mulish)' }}>
          {card.footerText}
        </p>
      )}
    </CardShell>
  )
}

function TextCardView({ card, index }: { card: Extract<GardenCard, { type: 'text' }>; index: number }) {
  return (
    <CardShell index={index} tag={card.tag}>
      <p className="text-sm leading-relaxed" style={{ color: '#2C1E0F', fontFamily: 'var(--font-mulish)' }}>
        {card.content}
      </p>
    </CardShell>
  )
}

function ReflectionMCCardView({ card, index }: { card: Extract<GardenCard, { type: 'reflection_mc' }>; index: number }) {
  return (
    <CardShell index={index} tag={card.tag}>
      <p className="text-sm font-semibold mb-3" style={{ color: '#2C1E0F', fontFamily: 'var(--font-mulish)' }}>
        {card.content}
      </p>
      <div className="space-y-1.5">
        {card.options.map((option, i) => (
          <div
            key={i}
            className="rounded-xl px-3 py-2 text-sm"
            style={{ background: 'rgba(230,218,200,0.4)', color: '#4A3A2A', fontFamily: 'var(--font-mulish)' }}
          >
            {option}
          </div>
        ))}
      </div>
    </CardShell>
  )
}

function MediaCardView({ card, index }: { card: Extract<GardenCard, { type: 'media' }>; index: number }) {
  return (
    <CardShell index={index} tag={card.tag}>
      <p className="text-sm mb-2" style={{ color: '#2C1E0F', fontFamily: 'var(--font-mulish)' }}>
        {card.content}
      </p>
      <p className="text-xs truncate" style={{ color: '#B8874A', fontFamily: 'var(--font-mulish)' }}>
        {card.mediaUrl}
      </p>
    </CardShell>
  )
}

function FinalReflectionView({ card }: { card: ReflectionFinalCard }) {
  return (
    <div className="surface overflow-hidden anim-fadeUp">
      <div
        className="flex items-center justify-between px-5 py-2.5"
        style={{ background: 'rgba(90,138,106,0.08)', borderBottom: '1px solid rgba(90,138,106,0.15)' }}
      >
        <span className="section-label" style={{ color: '#5A8A6A' }}>Final Reflection</span>
        <span className="text-xs font-semibold" style={{ color: '#5A8A6A', fontFamily: 'var(--font-mulish)', letterSpacing: '0.04em' }}>
          {card.tag}
        </span>
      </div>
      <div className="px-5 py-4">
        <p className="text-sm font-semibold mb-1" style={{ color: '#2C1E0F', fontFamily: 'var(--font-mulish)' }}>
          {card.content}
        </p>
        {card.placeholder && (
          <p className="text-xs" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)', fontStyle: 'italic' }}>
            Placeholder: {card.placeholder}
          </p>
        )}
      </div>
    </div>
  )
}

function renderCard(card: GardenCard, index: number) {
  switch (card.type) {
    case 'verse':         return <VerseCardView       key={card.id} card={card} index={index} />
    case 'text':          return <TextCardView         key={card.id} card={card} index={index} />
    case 'reflection_mc': return <ReflectionMCCardView key={card.id} card={card} index={index} />
    case 'media':         return <MediaCardView        key={card.id} card={card} index={index} />
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GardenContentEditor({ garden }: Props) {
  const content = garden.content_json

  if (!content) {
    return (
      <div className="surface px-8 py-12 text-center" style={{ borderStyle: 'dashed' }}>
        <p className="text-sm" style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}>
          No content yet — gardens are still being generated.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Garden header info */}
      <div className="surface px-6 py-5 mb-4 anim-fadeUp">
        <p className="section-label mb-1">Title</p>
        <p className="text-base font-semibold" style={{ fontFamily: 'var(--font-mulish)', color: '#2C1E0F' }}>
          {content.title}
        </p>
        {content.push && (
          <>
            <p className="section-label mt-4 mb-1">Push notification</p>
            <p className="text-sm" style={{ fontFamily: 'var(--font-mulish)', color: '#8A7060' }}>
              {content.push}
            </p>
          </>
        )}
      </div>

      {/* Cards */}
      <p className="section-label mb-3">Cards</p>
      <div className="space-y-3">
        {content.cards.map((card, i) => renderCard(card, i))}
        <FinalReflectionView card={content.final_reflection} />
      </div>
    </div>
  )
}
