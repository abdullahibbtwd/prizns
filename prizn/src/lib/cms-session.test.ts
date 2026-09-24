import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  bindCmsSessionListener,
  refreshCmsSession,
  shouldAttemptCmsRefresh,
} from './cms-session'

describe('cms-session', () => {
  beforeEach(() => {
    bindCmsSessionListener(null)
    vi.unstubAllGlobals()
  })

  it('dedupes concurrent refresh calls into one network round-trip', async () => {
    let refreshCalls = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/auth/refresh')) {
        refreshCalls += 1
        await new Promise((r) => setTimeout(r, 20))
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

    const listener = vi.fn()
    bindCmsSessionListener(listener)

    const [a, b] = await Promise.all([
      refreshCmsSession(),
      refreshCmsSession(),
    ])

    expect(a).toBe(true)
    expect(b).toBe(true)
    expect(refreshCalls).toBe(1)
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ed@prizni.bg' }),
    )
  })

  it('only retries CMS API 401s, not auth endpoints', () => {
    const err = { status: 401 }
    expect(shouldAttemptCmsRefresh('/cms/articles', err)).toBe(true)
    expect(shouldAttemptCmsRefresh('/auth/me', err)).toBe(false)
    expect(shouldAttemptCmsRefresh('/auth/refresh', err)).toBe(false)
    expect(shouldAttemptCmsRefresh('/articles', err)).toBe(false)
  })
})
