/**
 * Regression tests for lib/dates.ts
 *
 * The critical invariant: garden_date is YYYY-MM-DD with NO timezone.
 * We parse it with new Date(y, m-1, d) (local time) to avoid the
 * UTC-midnight → previous-day-in-US-timezones bug.
 *
 * All dates here are fixed so results are timezone-stable.
 *
 * 2026-04-26 = Sunday
 * 2026-04-27 = Monday   ← week anchor for gardens Mon-Sat
 * 2026-04-28 = Tuesday
 * 2026-05-02 = Saturday
 */

import { describe, it, expect } from 'vitest'
import {
  formatGardenDateLong,
  formatGardenDateShort,
  gardenDayName,
  thisWeeksMondayISO,
  toISODate,
  isMondayISO,
  weekAnchorSundayISO,
} from '@/lib/dates'

describe('formatGardenDateLong', () => {
  it('formats a Monday correctly', () => {
    const result = formatGardenDateLong('2026-04-27')
    expect(result).toMatch(/Monday/)
    expect(result).toMatch(/April/)
    expect(result).toMatch(/27/)
  })

  it('formats a Sunday correctly', () => {
    const result = formatGardenDateLong('2026-04-26')
    expect(result).toMatch(/Sunday/)
    expect(result).toMatch(/April/)
    expect(result).toMatch(/26/)
  })

  // Regression: naïve new Date('2026-04-27') parses as UTC midnight →
  // renders as Apr 26 in US/Pacific. Ensure our local-time parser avoids this.
  it('does not shift the date due to UTC parsing', () => {
    // If the implementation used new Date(iso) instead of parseISODate, this
    // would fail in UTC-offset timezones when run at midnight UTC.
    expect(formatGardenDateLong('2026-04-27')).toMatch(/27/)
  })
})

describe('formatGardenDateShort', () => {
  it('includes abbreviated weekday and month', () => {
    const result = formatGardenDateShort('2026-04-27')
    expect(result).toMatch(/Mon/)
    expect(result).toMatch(/Apr/)
    expect(result).toMatch(/27/)
  })
})

describe('gardenDayName', () => {
  it('returns the full weekday name', () => {
    expect(gardenDayName('2026-04-27')).toBe('Monday')
    expect(gardenDayName('2026-04-26')).toBe('Sunday')
    expect(gardenDayName('2026-05-02')).toBe('Saturday')
  })
})

describe('toISODate', () => {
  it('formats a local Date as YYYY-MM-DD', () => {
    // Use the local-time constructor (not a string) to avoid UTC issues.
    const d = new Date(2026, 3, 27) // April is month 3 (0-indexed)
    expect(toISODate(d)).toBe('2026-04-27')
  })

  it('zero-pads month and day', () => {
    const d = new Date(2026, 0, 5) // Jan 5
    expect(toISODate(d)).toBe('2026-01-05')
  })
})

describe('isMondayISO', () => {
  it('returns true for a Monday', () => {
    expect(isMondayISO('2026-04-27')).toBe(true)
  })

  it('returns false for a Sunday', () => {
    expect(isMondayISO('2026-04-26')).toBe(false)
  })

  it('returns false for mid-week days', () => {
    expect(isMondayISO('2026-04-28')).toBe(false) // Tuesday
    expect(isMondayISO('2026-05-02')).toBe(false) // Saturday
  })
})

describe('thisWeeksMondayISO', () => {
  it('returns the same Monday when given a Monday', () => {
    expect(thisWeeksMondayISO(new Date(2026, 3, 27))).toBe('2026-04-27')
  })

  it('slides back to Monday from mid-week', () => {
    expect(thisWeeksMondayISO(new Date(2026, 3, 29))).toBe('2026-04-27') // Wed
    expect(thisWeeksMondayISO(new Date(2026, 4, 2))).toBe('2026-04-27')  // Sat
  })

  it('slides back to previous Monday from Sunday', () => {
    // Sunday 2026-04-26 → previous Monday 2026-04-20
    expect(thisWeeksMondayISO(new Date(2026, 3, 26))).toBe('2026-04-20')
  })
})

describe('weekAnchorSundayISO', () => {
  it('returns the Sunday before a Monday', () => {
    expect(weekAnchorSundayISO('2026-04-27')).toBe('2026-04-26')
  })

  it('returns the input unchanged for a Sunday', () => {
    expect(weekAnchorSundayISO('2026-04-26')).toBe('2026-04-26')
  })

  it('returns the Sunday of the same week for a mid-week date', () => {
    expect(weekAnchorSundayISO('2026-04-29')).toBe('2026-04-26') // Wednesday
    expect(weekAnchorSundayISO('2026-05-02')).toBe('2026-04-26') // Saturday
  })
})
