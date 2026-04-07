import { apiGet, apiPut, apiDelete } from './client'
import type {
  Sermon,
  PresignedUploadResponse,
  CompleteUploadRequest,
} from './types'

export async function getSermons(): Promise<Sermon[]> {
  return apiGet<Sermon[]>('/library/sermons')
}

export async function getSermon(id: number): Promise<Sermon> {
  return apiGet<Sermon>(`/library/sermons/${id}`)
}

/**
 * Step 1 of the upload flow: ask the backend for a pre-signed S3 URL.
 * The backend creates a video record and returns the upload URL.
 */
export async function requestPresignedUpload(
  filename: string,
  content_type: string
): Promise<PresignedUploadResponse> {
  return apiPut<PresignedUploadResponse>('/library/sermons/presign', {
    filename,
    content_type,
  })
}

/**
 * Step 3 of the upload flow: notify the backend that the S3 upload is done.
 * The backend will kick off Elastic Transcoder processing.
 */
export async function completeSermonUpload(
  data: CompleteUploadRequest
): Promise<Sermon> {
  return apiPut<Sermon>('/library/sermons/create', data)
}

export async function deleteSermon(id: number): Promise<void> {
  return apiDelete(`/library/sermons/${id}`)
}
