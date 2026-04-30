'use server'

import { updateGarden } from '@/lib/api/garden'

export async function setGoLiveDate(gardenId: string, date: string | null) {
  await updateGarden(gardenId, { go_live_date: date })
}
