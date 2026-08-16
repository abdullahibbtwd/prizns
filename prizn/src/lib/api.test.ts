import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from './api'

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('performs GET requests with credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.get<{ ok: boolean }>('/health')).resolves.toEqual({
      ok: true,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/health'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('throws ApiError with server message on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Invalid credentials' }), {
          status: 401,
          statusText: 'Unauthorized',
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(api.post('/auth/login', {})).rejects.toMatchObject({
      status: 401,
      message: 'Invalid credentials',
    } satisfies Partial<ApiError>)
  })

  it('returns undefined for 204 responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    )

    await expect(api.delete('/resource/1')).resolves.toBeUndefined()
  })

  it('sets JSON content-type for write requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: '1' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await api.patch('/cms/todos/1', { done: true })

    const [, init] = fetchMock.mock.calls[0]!
    expect((init?.headers as Headers).get('Content-Type')).toBe(
      'application/json',
    )
  })
})
