/**
 * Feature flags and configuration.
 */

/**
 * When true, the frontend calls /videos/{id}/upload-complete after the S3
 * upload finishes. Set to false once the Lambda trigger is confirmed working.
 */
export const TRIGGER_UPLOAD_COMPLETE = true
