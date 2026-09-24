import type { CmsUserRole } from '@/lib/cms-roles'
import {
  refreshCmsSession,
  shouldAttemptCmsRefresh,
} from '@/lib/cms-session'

export type { CmsUserRole }

export type AuthUser = {
  id: string
  email: string
  name: string | null
  role: CmsUserRole
  roles?: CmsUserRole[]
  imageUrl?: string | null
  emailVerified?: boolean
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003/api'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export type RequestOptions = {
  /** Do not try refresh+retry on 401 (auth bootstrap / refresh itself). */
  skipAuthRefresh?: boolean
}

async function parseError(response: Response) {
  let message = response.statusText
  try {
    const body = (await response.json()) as { message?: string | string[] }
    if (Array.isArray(body.message)) message = body.message.join(', ')
    else if (body.message) message = body.message
  } catch {
    // ignore
  }
  throw new ApiError(response.status, message)
}

async function request<T>(
  path: string,
  init?: RequestInit,
  options?: RequestOptions,
): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  })

  if (!response.ok) {
    try {
      await parseError(response)
    } catch (error) {
      if (
        !options?.skipAuthRefresh &&
        shouldAttemptCmsRefresh(path, error)
      ) {
        const recovered = await refreshCmsSession()
        if (recovered) {
          return request<T>(path, init, { ...options, skipAuthRefresh: true })
        }
      }
      throw error
    }
  }
  if (response.status === 204) return undefined as T
  return response.json() as T
}

export const api = {
  get: <T,>(path: string, options?: RequestOptions) =>
    request<T>(path, undefined, options),
  post: <T,>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(
      path,
      {
        method: 'POST',
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      options,
    ),
  patch: <T,>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(
      path,
      {
        method: 'PATCH',
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      options,
    ),
  put: <T,>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(
      path,
      {
        method: 'PUT',
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      options,
    ),
  delete: <T,>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: 'DELETE' }, options),
  upload: <T,>(
    path: string,
    file: File,
    query?: Record<string, string>,
    fields?: Record<string, string>,
  ) => {
    const form = new FormData()
    form.append('file', file)
    if (fields) {
      for (const [key, value] of Object.entries(fields)) {
        if (value) form.append(key, value)
      }
    }
    const qs = query
      ? `?${new URLSearchParams(query).toString()}`
      : ''
    return request<T>(`${path}${qs}`, { method: 'POST', body: form })
  },
  uploadForm: <T,>(path: string, form: FormData) =>
    request<T>(path, { method: 'POST', body: form }),
}
