/**
 * Derives the public URL for a garden's daily background image.
 * Images live in the `garden-images` Supabase Storage bucket and are
 * named by garden_date: YYYY-MM-DD.jpeg
 *
 * Safe to call from both server components and client components because
 * it only uses NEXT_PUBLIC_ environment variables.
 */
export function gardenImageUrl(gardenDate: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!
  return `${base}/storage/v1/object/public/garden-images/${gardenDate}.jpeg`
}
