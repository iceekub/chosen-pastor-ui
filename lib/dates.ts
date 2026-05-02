/**
 * Display helpers for garden dates.
 *
 * `gardens.garden_date` is a Postgres `date` (YYYY-MM-DD, no time, no
 * timezone). Naïvely passing the string to `new Date()` parses it as
 * UTC midnight, which renders as the previous day in any timezone
 * west of UTC. The helpers here parse the components manually so the
 * Date object lands in local time.
 */

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Long display, e.g. "Wednesday, March 4". Used in headers/detail. */
export function formatGardenDateLong(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

/** Short display, e.g. "Wed, Mar 4". Used in dense list rows. */
export function formatGardenDateShort(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** Just the weekday name, e.g. "Wednesday". */
export function gardenDayName(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-US', { weekday: 'long' })
}

/**
 * The Monday of the week containing `date` (or `today` if omitted),
 * formatted as YYYY-MM-DD. Useful as a default value for the "pick a
 * week" form input.
 */
export function thisWeeksMondayISO(date: Date = new Date()): string {
  const d = new Date(date)
  // getDay(): 0 = Sunday … 6 = Saturday. Slide back to Monday.
  // Sunday rolls back 6 days (to last Monday); Mon-Sat roll back
  // (getDay() - 1) days.
  const dow = d.getDay()
  const slide = dow === 0 ? 6 : dow - 1
  d.setDate(d.getDate() - slide)
  return toISODate(d)
}

/** Format a Date as YYYY-MM-DD in *local* time (not UTC). */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** True iff the YYYY-MM-DD date string is a Monday in local time. */
export function isMondayISO(iso: string): boolean {
  return parseISODate(iso).getDay() === 1
}

/**
 * Mirror of ragserv's ``week_anchor_sunday(d)``: the Sunday of the
 * Sun-Sat span containing ``iso``. Returns the input unchanged when
 * ``iso`` already names a Sunday.
 *
 * Useful for grouping videos by week client-side (e.g. fetching the
 * week's primary banner without having to ask the server for the
 * anchor of an arbitrary date).
 */
export function weekAnchorSundayISO(iso: string): string {
  const d = parseISODate(iso)
  // getDay(): 0 = Sun … 6 = Sat. Slide back that many days to land
  // on Sunday (0 days when already Sunday).
  d.setDate(d.getDate() - d.getDay())
  return toISODate(d)
}
