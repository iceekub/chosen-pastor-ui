import { apiPost } from './client'
import type { LoginResponse } from './types'

export async function loginWithCredentials(
  email: string,
  password: string
): Promise<LoginResponse> {
  return apiPost<LoginResponse>('/user/current/login', { email, password })
}

export async function logoutApi(): Promise<void> {
  return apiPost<void>('/user/current/logout', {})
}
