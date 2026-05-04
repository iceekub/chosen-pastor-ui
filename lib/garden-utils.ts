/**
 * Pure garden utilities — no server-only imports, safe to use in both
 * Server Components and Client Components.
 */
import type { GardenContent } from './api/types'

/**
 * The AI-generated display title (≤22 chars) from content_json,
 * falling back to the topic when absent (older/seed records).
 */
export function gardenDisplayTitle(
  topic: string,
  content_json: GardenContent | null | undefined,
): string {
  return content_json?.title || topic
}
