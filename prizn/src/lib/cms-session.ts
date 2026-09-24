/**
 * CMS session helpers — single-flight refresh so concurrent StrictMode /
 * remount bootstraps cannot rotate the refresh token twice and wipe auth state.
 */

type AuthUser = {
  id: string
  email: string
  name: string | null
  role: string
  roles?: string[]
  imageUrl?: string | null
  emailVerified?: boolean
}

type SessionListener = (user: AuthUser | null) => void

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003/api'

let refreshInFlight: Promise<boolean> | null = null
let listener: SessionListener | null = null

/** AuthProvider registers so successful/failed refresh updates React state. */
export function bindCmsSessionListener(next: SessionListener | null) {
  listener = next
}

async function rawJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  })
  if (!response.ok) {
    let message = response.statusText
    try {
      const body = (await response.json()) as { message?: string | string[] }
      if (Array.isArray(body.message)) message = body.message.join(', ')
      else if (body.message) message = body.message
    } catch {
      // ignore
    }
    const error = new Error(message) as Error & { status: number }
    error.status = response.status
    throw error
  }
  if (response.status === 204) return undefined as T
  return response.json() as T
}

/**
 * Rotate access+refresh cookies. Concurrent callers share one in-flight request.
 * Returns true when a valid CMS user is available afterward.
 */
export async function refreshCmsSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    try {
      await rawJson('/auth/refresh', { method: 'POST' })
      const me = await rawJson<{ user: AuthUser }>('/auth/me')
      listener?.(me.user)
      return true
    } catch {
      listener?.(null)
      return false
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

export function isCmsAuthPath(path: string) {
  return (
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/refresh') ||
    path.startsWith('/auth/logout') ||
    path.startsWith('/auth/me') ||
    path.startsWith('/auth/verify-email') ||
    path.startsWith('/auth/resend-verification')
  )
}

export function shouldAttemptCmsRefresh(path: string, error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const status = (error as { status?: number }).status
  if (status !== 401) return false
  if (isCmsAuthPath(path)) return false
  return path.startsWith('/cms/')
}
