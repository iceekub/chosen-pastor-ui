import { apiGet, apiPut, apiPost } from './client'
import type {
  Garden,
  Card,
  CreateGardenRequest,
  CreateCardRequest,
  UpdateCardRequest,
} from './types'

export async function getGardens(): Promise<Garden[]> {
  return apiGet<Garden[]>('/gardens')
}

export async function getGarden(id: number): Promise<Garden> {
  return apiGet<Garden>(`/garden/${id}`)
}

export async function createGarden(data: CreateGardenRequest): Promise<Garden> {
  return apiPut<Garden>('/garden/create', data)
}

export async function createCard(
  gardenId: number,
  data: CreateCardRequest
): Promise<Card> {
  return apiPut<Card>(`/garden/${gardenId}/card/create`, data)
}

export async function updateCard(
  gardenId: number,
  cardId: number,
  data: UpdateCardRequest
): Promise<Card> {
  return apiPost<Card>(`/garden/${gardenId}/card/${cardId}`, data)
}

export async function approveGarden(gardenId: number): Promise<Garden> {
  return apiPost<Garden>(`/garden/${gardenId}/approve`, {})
}
