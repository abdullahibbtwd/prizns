import type { MouseEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { cn, handleSmoothNavClick, randomId, smoothScrollToHash } from './utils'

describe('cn', () => {
  it('merges tailwind classes', () => {
    expect(cn('px-2', 'px-4', false && 'hidden', 'text-sm')).toBe('px-4 text-sm')
  })
})

describe('randomId', () => {
  it('returns a uuid when crypto.randomUUID exists', () => {
    const spy = vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '11111111-1111-4111-8111-111111111111',
    )
    expect(randomId()).toBe('11111111-1111-4111-8111-111111111111')
    spy.mockRestore()
  })

  it('falls back when randomUUID is unavailable', () => {
    const original = crypto.randomUUID
    // @ts-expect-error test override
    crypto.randomUUID = undefined
    expect(randomId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
    crypto.randomUUID = original
  })
})

describe('smoothScrollToHash', () => {
  it('scrolls to an element and updates the hash', () => {
    const target = document.createElement('div')
    target.id = 'section-a'
    document.body.appendChild(target)

    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const pushSpy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {})

    smoothScrollToHash('#section-a', 40)

    expect(scrollSpy).toHaveBeenCalled()
    expect(pushSpy).toHaveBeenCalledWith(null, '', '#section-a')

    target.remove()
  })

  it('ignores empty hashes', () => {
    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    smoothScrollToHash('#')
    expect(scrollSpy).not.toHaveBeenCalled()
  })
})

describe('handleSmoothNavClick', () => {
  it('prevents default for in-page hash links', () => {
    const preventDefault = vi.fn()
    handleSmoothNavClick(
      { preventDefault } as unknown as MouseEvent<HTMLAnchorElement>,
      '#top',
    )
    expect(preventDefault).toHaveBeenCalled()
  })

  it('does nothing for regular links', () => {
    const preventDefault = vi.fn()
    handleSmoothNavClick(
      { preventDefault } as unknown as MouseEvent<HTMLAnchorElement>,
      '/stories',
    )
    expect(preventDefault).not.toHaveBeenCalled()
  })
})
