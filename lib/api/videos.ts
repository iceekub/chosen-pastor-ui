import { apiGet, apiPost } from './client'
import type {
  Video,
  VideoListItem,
  VideoCreateResponse,
} from './types'

export async function getVideos(): Promise<VideoListItem[]> {
  return apiGet<VideoListItem[]>('/videos')
}

export async function getVideo(id: string): Promise<Video> {
  return apiGet<Video>(`/videos/${id}`)
}

export async function createVideo(
  title: string,
  description?: string,
  video_type: string = 'sermon'
): Promise<VideoCreateResponse> {
  return apiPost<VideoCreateResponse>('/videos', {
    title,
    ...(description ? { description } : {}),
    video_type,
  })
}

export async function completeUpload(videoId: string): Promise<Video> {
  return apiPost<Video>(`/videos/${videoId}/upload-complete`, {})
}
