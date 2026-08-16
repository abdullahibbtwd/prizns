import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ensureReactionVisitorKey,
  ensureVisitorKey,
  getAnalyticsSessionId,
  getCookieConsent,
  getVisitorKey,
  setAnalyticsSessionId,
  setCookieConsent,
  VISITOR_KEY,
} from './cookie-consent'

describe('cookie-consent', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('returns null when consent has not been set', () => {
    expect(getCookieConsent()).toBeNull()
    expect(getVisitorKey()).toBeNull()
  })

  it('stores accepted consent and creates a visitor key', () => {
    const listener = vi.fn()
    window.addEventListener('prizni-cookie-consent', listener)

    setCookieConsent('accepted')

    expect(getCookieConsent()).toBe('accepted')
    const visitor = ensureVisitorKey()
    expect(visitor).toBeTruthy()
    expect(localStorage.getItem(VISITOR_KEY)).toBe(visitor)
    expect(listener).toHaveBeenCalled()

    window.removeEventListener('prizni-cookie-consent', listener)
  })

  it('clears visitor identity when consent is declined', () => {
    setCookieConsent('accepted')
    const visitor = ensureVisitorKey()
    expect(visitor).toBeTruthy()

    setCookieConsent('declined')

    expect(getCookieConsent()).toBe('declined')
    expect(getVisitorKey()).toBeNull()
    expect(localStorage.getItem(VISITOR_KEY)).toBeNull()
  })

  it('persists analytics session ids in sessionStorage', () => {
    setAnalyticsSessionId('session-123')
    expect(getAnalyticsSessionId()).toBe('session-123')
  })

  it('uses a session-only reaction key without consent', () => {
    const key = ensureReactionVisitorKey()
    expect(key).toBeTruthy()
    expect(getVisitorKey()).toBeNull()
  })
})
