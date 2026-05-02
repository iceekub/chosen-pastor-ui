'use server'

import { updateGarden } from '@/lib/api/garden'
import type { GardenContent } from '@/lib/api/types'

export async function saveGardenContent(gardenId: string, content: GardenContent) {
  await updateGarden(gardenId, { content_json: content })
}
