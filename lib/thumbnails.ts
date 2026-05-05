/**
 * Helpers for the auto-generated MediaConvert thumbnail bucket.
 *
 * The auto-frames live in the AWS S3 ${prefix}-thumbnails bucket
 * (provisioned by `ragserv/terraform/buckets.tf`, public-read). The
 * row's `thumbnail_keys` array stores the S3 keys; this module
 * turns those keys into the public URLs the browser renders.
 *
 * The bucket is public, so leaking its name in the frontend env is
 * deliberate — every `<img src>` for an auto-frame already exposes
 * it. Storing the full base URL once in
 * `NEXT_PUBLIC_AWS_THUMBNAILS_BUCKET_URL` (e.g.
 * `https://ragserv-prod-thumbnails.s3.us-west-2.amazonaws.com`)
 * means we don't repeat the construction across components and a
 * future move to CloudFront just changes the env var.
 */

const BASE = process.env.NEXT_PUBLIC_AWS_THUMBNAILS_BUCKET_URL ?? ''

/**
 * Convert an auto-frame S3 key (e.g.
 * `churches/<church>/videos/<video>/thumb_.0000003.jpg`) to a
 * public URL.
 *
 * Returns an empty string when the env var is unset — the picker
 * treats this as "auto-frame URLs unavailable" and degrades to
 * upload-only. Logged once at module load via the warning below.
 */
export function thumbnailKeyToUrl(key: string): string {
  if (!BASE) return ''
  return `${BASE.replace(/\/$/, '')}/${key.replace(/^\//, '')}`
}

/**
 * True iff a given URL points at our auto-frames bucket. Useful for
 * the picker to decide which candidate (if any) is "selected".
 */
export function isAutoFrameUrl(url: string | null): boolean {
  if (!url || !BASE) return false
  return url.startsWith(BASE.replace(/\/$/, ''))
}

if (!BASE && typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  // Server-side warn once on cold start. Client-side stays silent —
  // the picker degrades visibly there.
  console.warn(
    'NEXT_PUBLIC_AWS_THUMBNAILS_BUCKET_URL is not set — the thumbnail '
    + 'picker will only show the upload affordance, not the auto-generated '
    + 'frame candidates.',
  )
}
