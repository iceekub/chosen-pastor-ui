import { apiGet, apiPost } from './client'
import type {
  Video,
  VideoListItem,
  VideoCreateResponse,
  GardenListItem,
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

export async function generateGardens(
  videoId: string,
  instructions?: string
): Promise<GardenListItem[]> {
  return apiPost<GardenListItem[]>(
    `/videos/${videoId}/generate-gardens`,
    instructions ? { instructions } : {}
  )
}

export async function getVideoGardens(videoId: string): Promise<GardenListItem[]> {
  return apiGet<GardenListItem[]>(`/videos/${videoId}/gardens`)
}
