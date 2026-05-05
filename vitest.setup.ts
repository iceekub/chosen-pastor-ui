import '@testing-library/jest-dom'

// Deterministic value for the auto-frames public-bucket URL so the
// thumbnail picker's URL construction is testable. Real Next builds
// inline these NEXT_PUBLIC_* values at compile time; vitest reads
// process.env at module load, so set it here before any test imports
// `lib/thumbnails`.
process.env.NEXT_PUBLIC_AWS_THUMBNAILS_BUCKET_URL =
  'https://test-thumbnails.s3.us-west-2.amazonaws.com'
