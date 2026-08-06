export type AuthUser = {
  id: string
  email: string
  name: string | null
  role: 'ADMIN' | 'EDITOR'
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003/api'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  })

  if (!response.ok) await parseError(response)
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T,>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T,>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T,>(path: string) => request<T>(path, { method: 'DELETE' }),
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
}
