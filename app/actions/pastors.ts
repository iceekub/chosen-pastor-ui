'use server'

import { verifySession } from '@/lib/dal'
import { createPastor, updatePastor, deletePastor } from '@/lib/api/pastors'
import type { Pastor } from '@/lib/api/types'

export type PastorActionResult = {
  error?: string
  success?: boolean
  pastor?: Pastor
}

export async function createPastorAction(
  formData: FormData,
): Promise<PastorActionResult> {
  const user = await verifySession()
  if (!user.church_id) return { error: 'No church associated with your account.' }

  const name = (formData.get('name') as string | null)?.trim()
  if (!name) return { error: 'Name is required.' }

  const title = (formData.get('title') as string | null)?.trim() || null

  try {
    const pastor = await createPastor(user.church_id, { name, title })
    return { success: true, pastor }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to create pastor' }
  }
}

export async function updatePastorAction(
  id: string,
  formData: FormData,
): Promise<PastorActionResult> {
  await verifySession()

  const name = (formData.get('name') as string | null)?.trim()
  if (!name) return { error: 'Name is required.' }

  const title = (formData.get('title') as string | null)?.trim() || null

  try {
    const pastor = await updatePastor(id, { name, title })
    return { success: true, pastor }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to update pastor' }
  }
}

export async function deletePastorAction(
  id: string,
): Promise<PastorActionResult> {
  await verifySession()
  try {
    await deletePastor(id)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to delete pastor' }
  }
}

/**
 * Persist new display_order values after a client-side reorder.
 * Takes an ordered list of IDs and assigns display_order = 0, 1, 2, …
 */
export async function reorderPastorsAction(
  orderedIds: string[],
): Promise<PastorActionResult> {
  await verifySession()
  try {
    await Promise.all(
      orderedIds.map((id, index) => updatePastor(id, { display_order: index })),
    )
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to reorder' }
  }
}
