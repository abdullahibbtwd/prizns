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

  it('refreshes once and retries CMS calls on 401', async () => {
    let articleCalls = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/cms/articles')) {
        articleCalls += 1
        if (articleCalls === 1) {
          return new Response(JSON.stringify({ message: 'expired' }), {
            status: 401,
            statusText: 'Unauthorized',
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (url.includes('/auth/refresh')) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }
      if (url.includes('/auth/me')) {
        return new Response(
          JSON.stringify({
            user: {
              id: 'u1',
              email: 'ed@prizni.bg',
              name: 'Ed',
              role: 'EDITOR',
            },
          }),
          { status: 200 },
        )
      }
      return new Response('missing', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.get('/cms/articles')).resolves.toEqual({ items: [] })
    expect(articleCalls).toBe(2)
    expect(
      fetchMock.mock.calls.some((call) =>
        String(call[0]).includes('/auth/refresh'),
      ),
    ).toBe(true)
  })
})
