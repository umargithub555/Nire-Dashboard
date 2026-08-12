import { config } from '../config'
import { supabase } from './supabase'

export async function apiFetch<T>(path: string, options: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Please sign in again.')
  }

  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...(options.headers ?? {}),
    },
  })

  const payload = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(payload?.error ?? 'Request failed')
  }

  return payload as T
}
