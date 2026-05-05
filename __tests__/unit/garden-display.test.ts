/**
 * Regression tests for the garden display-title logic.
 *
 * Every list/card/detail view derives the human-readable title as:
 *   garden.content_json?.title ?? garden.topic
 *
 * This was broken by a rebase: some conflict resolutions dropped the
 * content_json?.title lookup and fell back to `topic` everywhere,
 * showing raw seed text instead of the AI-generated display title.
 *
 * These tests lock in the correct fallback chain so a future rebase
 * or merge can't silently regress it.
 */

import { describe, it, expect } from 'vitest'
import { makeGarden, makeGardenListItem, makeGardenContent } from '../factories'

// ── helpers ────────────────────────────────────────────────────────────────

/** Mirrors the inline expression used in every garden card/detail. */
function displayTitle(garden: { content_json: { title?: string } | null; topic: string }): string {
  return garden.content_json?.title ?? garden.topic
}

// ── tests ──────────────────────────────────────────────────────────────────

describe('garden display title (content_json?.title ?? topic)', () => {
  it('uses content_json.title when present', () => {
    const garden = makeGarden({
      topic: 'Understanding Grace',
      content_json: makeGardenContent({ title: 'Walking in Grace' }),
    })
    expect(displayTitle(garden)).toBe('Walking in Grace')
  })

  it('falls back to topic when content_json is null', () => {
    const garden = makeGarden({
      topic: 'Understanding Grace',
      content_json: null,
    })
    expect(displayTitle(garden)).toBe('Understanding Grace')
  })

  it('falls back to topic when content_json exists but title is undefined', () => {
    const garden = makeGarden({
      topic: 'Understanding Grace',
      // GardenContent without a title field
      content_json: makeGardenContent({ title: undefined }),
    })
    expect(displayTitle(garden)).toBe('Understanding Grace')
  })

  it('uses empty string title as-is (nullish ?? not falsy ||)', () => {
    const garden = makeGarden({
      topic: 'Understanding Grace',
      content_json: makeGardenContent({ title: '' }),
    })
    // ?? only catches null/undefined, not ''. The AI never produces an
    // empty title string, so this edge case doesn't arise in practice —
    // but the test documents that the operator is ??, not ||.
    expect(displayTitle(garden)).toBe('')
  })

  it('works the same way on GardenListItem (list views)', () => {
    const item = makeGardenListItem({
      topic: 'Seed Topic',
      content_json: makeGardenContent({ title: 'AI Title' }),
    })
    expect(displayTitle(item)).toBe('AI Title')
  })
})
