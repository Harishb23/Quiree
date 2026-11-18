import axios, { AxiosError } from 'axios'
import { config } from '../config'
import { tokenStorage } from '../lib/tokenStorage'

export const api = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 30000,
})

api.interceptors.request.use((request) => {
  const token = tokenStorage.get()
  if (token) request.headers.Authorization = `Bearer ${token}`
  return request
})

/** Listeners notified when the API rejects our token (expired / revoked). */
const unauthorizedListeners = new Set<() => void>()
export const onUnauthorized = (listener: () => void) => {
  unauthorizedListeners.add(listener)
  return () => {
    unauthorizedListeners.delete(listener)
  }
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && tokenStorage.get()) {
      tokenStorage.clear()
      unauthorizedListeners.forEach((l) => l())
    }
    return Promise.reject(error)
  },
)

interface ProblemDetails {
  title?: string
  detail?: string
  errors?: Record<string, string[]>
}

/** Turns API / network errors into a user-facing message. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Unable to reach the server. Check your connection and try again.'
    if (error.response.status === 429) return 'Too many attempts. Please wait a moment and try again.'
    const data = error.response.data as ProblemDetails | undefined
    if (data?.errors) {
      const first = Object.values(data.errors).flat()[0]
      if (first) return first
    }
    return data?.detail || data?.title || fallback
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

/** Field-level validation errors keyed by camelCase field name. */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) return {}
  const data = error.response?.data as ProblemDetails | undefined
  if (!data?.errors) return {}
  return Object.fromEntries(
    Object.entries(data.errors).map(([key, messages]) => [key.charAt(0).toLowerCase() + key.slice(1), messages[0]]),
  )
}
